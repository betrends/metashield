// Starts a card checkout for the chosen package: Paystack when its key is
// set (monthly and yearly packages then renew automatically — see
// lib/server/paystack.ts), otherwise Korapay. The client pays and comes
// back to /portal/billing?kpref=<reference> — the Packages page then calls
// /api/subscribe/verify to confirm and activate it.
//
// Answers, in order: 400 unknown package · 503 card payment not set up
// (the page falls back to WhatsApp) · 401 sign in first · 200 checkoutUrl.

import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { cardPaymentsEnabled, getPlan, isPlanId } from "@/lib/portal/billing";
import { newPaystackReference, paystack, paystackEnabled, paystackInterval } from "@/lib/server/paystack";

function generateRef(): string {
  return `ms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  let body: { planId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const planId = body.planId;
  if (!isPlanId(planId)) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }
  // Card payment isn't set up (no Korapay key, or switched off).
  if (!cardPaymentsEnabled()) {
    return NextResponse.json({ error: "card_payments_disabled" }, { status: 503 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const plan = getPlan(planId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  // Paystack (when set up): card only for monthly and yearly packages, so
  // the card can be charged again automatically each period.
  if (paystackEnabled()) {
    if (!user.email) return NextResponse.json({ error: "no_email" }, { status: 400 });
    const reference = newPaystackReference();
    const init = await paystack<{ authorization_url?: string }>("/transaction/initialize", {
      method: "POST",
      body: {
        email: user.email,
        amount: plan.priceKobo,
        currency: "NGN",
        reference,
        callback_url: `${appUrl}/portal/billing?kpref=${encodeURIComponent(reference)}`,
        ...(paystackInterval(plan) ? { channels: ["card"] } : {}),
        metadata: {
          planId: plan.id,
          userId: user.id,
          custom_fields: [{ display_name: "Package", variable_name: "package", value: plan.name }],
        },
      },
    });
    if (!init.status || !init.data?.authorization_url) {
      console.error("Paystack initialize failed:", init.message);
      return NextResponse.json({ error: "paystack_error", detail: init.message }, { status: 502 });
    }
    return NextResponse.json({ checkoutUrl: init.data.authorization_url, reference });
  }

  const reference = generateRef();

  const res = await fetch("https://api.korapay.com/merchant/api/v1/charges/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KORAPAY_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reference,
      amount: plan.priceKobo / 100, // Korapay uses Naira, not kobo
      currency: "NGN",
      // Our own "kpref" brings the client back to confirm this exact payment
      // (not relying on how Korapay adds parameters to the return address).
      redirect_url: `${appUrl}/portal/billing?kpref=${encodeURIComponent(reference)}`,
      customer: {
        email: user.email,
        ...(user.user_metadata?.full_name ? { name: String(user.user_metadata.full_name).slice(0, 100) } : {}),
      },
      narration: `${plan.name} package`,
      metadata: { planId: plan.id, userId: user.id },
    }),
  });

  const data = await res.json();
  if (!data.status || !data.data?.checkout_url) {
    console.error("Korapay initialize failed:", data);
    return NextResponse.json({ error: "korapay_error", detail: data.message }, { status: 502 });
  }

  return NextResponse.json({
    checkoutUrl: data.data.checkout_url,
    reference,
  });
}
