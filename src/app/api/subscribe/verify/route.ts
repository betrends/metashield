// Verifies a Korapay payment reference and activates the subscription.
// Called by the billing page after Korapay redirects back with ?reference=xxx.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";
import { getPlan, isPlanId, planEndsOn } from "@/lib/portal/billing";
import { subscriptionWelcomeEmail } from "@/lib/email-templates";

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

  const planId = data.data?.metadata?.planId as unknown;
  if (!isPlanId(planId)) {
    return NextResponse.json({ error: "invalid_plan_in_metadata" }, { status: 400 });
  }

  const plan = getPlan(planId);
  // The amount actually paid (Korapay reports Naira) must cover the package.
  const paidNaira = Number(data.data?.amount_paid ?? data.data?.amount ?? 0);
  if (!(paidNaira * 100 >= plan.priceKobo)) {
    console.error("Korapay amount below package price:", { reference, paidNaira, plan: plan.id });
    return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, plan_id, status, renews_on")
    .eq("user_id", user.id)
    .maybeSingle();

  // Monthly packages run a month, Annual a year, Lifetime never ends.
  // Renewing the same package early adds the new period on top of what's
  // left, so the client doesn't lose days.
  const now = new Date();
  const currentEnd = existing?.renews_on ? new Date(existing.renews_on) : null;
  const extendFrom =
    existing?.status === "active" && existing.plan_id === plan.id && currentEnd && currentEnd > now ? currentEnd : now;
  const renewsOn = planEndsOn(plan, extendFrom);

  // The charge must belong to the signed-in user, so one client can't
  // activate a plan with someone else's payment reference.
  const chargeUserId = data.data?.metadata?.userId as string | undefined;
  if (chargeUserId && chargeUserId !== user.id) {
    return NextResponse.json({ error: "reference_not_yours" }, { status: 403 });
  }

  // Already recorded (e.g. the billing page verified this reference
  // before) — report success without inserting a second invoice.
  const { data: priorInvoice } = await admin
    .from("invoices")
    .select("id")
    .eq("paystack_reference", reference)
    .maybeSingle();
  if (priorInvoice) {
    return NextResponse.json({ ok: true, planId, planName: plan.name, alreadyRecorded: true });
  }

  let subscriptionId: string;
  if (existing) {
    const { error: updateError } = await admin
      .from("subscriptions")
      .update({ plan_id: planId, status: "active", renews_on: renewsOn, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (updateError) {
      // Previously ignored: the client was charged but the plan stayed
      // inactive while the page said "subscribed".
      console.error("Failed to activate subscription:", updateError);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
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

  const { error: invoiceError } = await admin.from("invoices").insert({
    user_id: user.id,
    subscription_id: subscriptionId,
    amount_kobo: plan.priceKobo,
    currency: "NGN",
    status: "paid",
    paystack_reference: reference,
  });
  if (invoiceError) {
    // The plan is active; only the history row is missing. Log it for
    // reconciliation rather than telling a paying client it failed.
    console.error("Subscription activated but invoice insert failed:", invoiceError, { reference });
  }

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
        subject: `Welcome to ${plan.name}`,
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
