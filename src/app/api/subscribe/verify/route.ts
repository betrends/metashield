// Verifies a Korapay payment reference and activates the subscription.
// Called by the billing page after Korapay redirects back with ?reference=xxx.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";
import { getPlan, type PlanId } from "@/lib/portal/billing";
import { subscriptionWelcomeEmail } from "@/lib/email-templates";

function nextRenewalDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: { reference?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  if (!reference) {
    return NextResponse.json({ error: "missing_reference" }, { status: 400 });
  }

  const secretKey = process.env.KORAPAY_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "KORAPAY_SECRET_KEY not configured" }, { status: 500 });
  }

  const res = await fetch(`https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const data = await res.json();

  if (!data.status || data.data?.status !== "success") {
    console.error("Korapay verify failed:", data);
    return NextResponse.json({ error: "payment_not_successful", detail: data.message }, { status: 400 });
  }

  const planId = data.data?.metadata?.planId as PlanId | undefined;
  if (!planId || !["basic", "professional", "business", "one_time"].includes(planId)) {
    return NextResponse.json({ error: "invalid_plan_in_metadata" }, { status: 400 });
  }

  const plan = getPlan(planId);
  const admin = createAdminClient();
  const renewsOn = nextRenewalDate();

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let subscriptionId: string;
  if (existing) {
    await admin
      .from("subscriptions")
      .update({ plan_id: planId, status: "active", renews_on: renewsOn, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    subscriptionId = existing.id;
  } else {
    const { data: inserted, error } = await admin
      .from("subscriptions")
      .insert({ user_id: user.id, plan_id: planId, status: "active", renews_on: renewsOn })
      .select("id")
      .single();
    if (error || !inserted) {
      console.error("Failed to create subscription:", error);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
    subscriptionId = inserted.id;
  }

  await admin.from("invoices").insert({
    user_id: user.id,
    subscription_id: subscriptionId,
    amount_kobo: plan.priceKobo,
    currency: "NGN",
    status: "paid",
    paystack_reference: reference,
  });

  // Send welcome email to the client
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (resendKey && fromAddress && user.email) {
    const clientName = (user.user_metadata?.full_name as string | undefined) || user.email.split("@")[0];
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: fromAddress,
        to: user.email,
        subject: `Welcome to Account Protection — ${plan.name} Plan`,
        html: subscriptionWelcomeEmail({
          clientName,
          planName: plan.name,
          planPrice: plan.price,
          priceSuffix: plan.priceSuffix ?? "",
          features: plan.features,
          renewsOn,
        }),
      });
    } catch (e) {
      console.error("Failed to send subscription welcome email:", e);
    }
  }

  return NextResponse.json({ ok: true, planId, planName: plan.name });
}
