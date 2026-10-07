// Initializes a Korapay checkout for the chosen plan. The client is
// redirected to Korapay, pays, and Korapay redirects back to
// /portal/billing?reference=xxx — the billing page then calls
// /api/subscribe/verify to confirm and activate the plan.

import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getPlan, type PlanId } from "@/lib/portal/billing";

const VALID_PLAN_IDS: PlanId[] = ["basic", "professional", "business", "one_time"];

function generateRef(): string {
  return `ms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: { planId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const planId = typeof body.planId === "string" ? body.planId : "";
  if (!VALID_PLAN_IDS.includes(planId as PlanId)) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  const secretKey = process.env.KORAPAY_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "KORAPAY_SECRET_KEY not configured" }, { status: 500 });
  }

  const plan = getPlan(planId as PlanId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const reference = generateRef();

  const res = await fetch("https://api.korapay.com/merchant/api/v1/charges/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reference,
      amount: plan.priceKobo / 100, // Korapay uses Naira, not kobo
      currency: "NGN",
      redirect_url: `${appUrl}/portal/billing`,
      customer: { email: user.email },
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
