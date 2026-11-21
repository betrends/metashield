// Paystack's notifications (set this address as the Webhook URL in the
// Paystack dashboard: https://<site>/api/paystack/webhook).
//
// Every notification is signed with the secret key; unsigned or wrongly
// signed ones are refused. Handled:
//   charge.success          first payment (our checkout) → package on and
//                           automatic renewal set up; renewal charge
//                           (subscription) → package extended by one period
//   invoice.payment_failed  renewal charge failed → email the client a link
//                           to update their card
//   subscription.disable /
//   subscription.not_renew  automatic renewal stopped → recorded
// Answers 500 when saving fails, so Paystack tries again later.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getPlan, isPlanId } from "@/lib/portal/billing";
import { metadataOf, paystackManageLink, validPaystackSignature, type PaystackTransaction } from "@/lib/server/paystack";
import { activatePaidPackage, extendPaidPackage } from "@/lib/server/activate-package";
import { setupAutoRenew, type BillingRow } from "@/lib/server/paystack-autopay";
import { autopayFailedEmail } from "@/lib/email-templates";
import { senderFrom } from "@/lib/server/sender";

type Event = { event?: string; data?: Record<string, unknown> };

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validPaystackSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }
  let evt: Event;
  try {
    evt = JSON.parse(raw) as Event;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const admin = createAdminClient();
  const data = (evt.data ?? {}) as Record<string, unknown>;

  try {
    switch (evt.event) {
      case "charge.success":
        return await chargeSuccess(admin, data as PaystackTransaction);
      case "invoice.payment_failed":
        return await paymentFailed(admin, data, request);
      case "subscription.disable":
      case "subscription.not_renew": {
        const code = (data.subscription_code as string | undefined) ?? undefined;
        if (code) {
          await admin
            .from("paystack_billing")
            .update({ auto_renew: false, next_charge_on: null, updated_at: new Date().toISOString() })
            .eq("subscription_code", code);
        }
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ ok: true, ignored: evt.event ?? null });
    }
  } catch (e) {
    console.error("[paystack webhook] failed:", evt.event, e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function findBilling(admin: ReturnType<typeof createAdminClient>, by: { customerCode?: string; subscriptionCode?: string; email?: string }) {
  if (by.subscriptionCode) {
    const { data } = await admin.from("paystack_billing").select("*").eq("subscription_code", by.subscriptionCode).maybeSingle();
    if (data) return data as BillingRow;
  }
  if (by.customerCode) {
    const { data } = await admin.from("paystack_billing").select("*").eq("customer_code", by.customerCode).maybeSingle();
    if (data) return data as BillingRow;
  }
  if (by.email) {
    const { data } = await admin.from("paystack_billing").select("*").ilike("email", by.email).limit(1).maybeSingle();
    if (data) return data as BillingRow;
  }
  return null;
}

async function chargeSuccess(admin: ReturnType<typeof createAdminClient>, tx: PaystackTransaction) {
  const reference = tx.reference ?? "";
  if (!reference || tx.status !== "success" || (tx.currency && tx.currency !== "NGN")) {
    return NextResponse.json({ ok: true, ignored: "not_a_successful_ngn_charge" });
  }
  const md = metadataOf(tx);
  const amountKobo = Number(tx.amount ?? 0);

  // First payment from our own checkout: it carries our metadata.
  if (typeof md.userId === "string" && isPlanId(md.planId)) {
    const plan = getPlan(md.planId);
    if (amountKobo < plan.priceKobo) {
      console.error("[paystack webhook] amount below package price:", { reference, amountKobo, plan: plan.id });
      return NextResponse.json({ ok: true, ignored: "amount_mismatch" });
    }
    const { data: userData } = await admin.auth.admin.getUserById(md.userId);
    const user = userData?.user;
    if (!user) return NextResponse.json({ ok: true, ignored: "unknown_user" });
    const email = user.email ?? tx.customer?.email ?? null;
    const result = await activatePaidPackage(admin, {
      userId: user.id,
      email,
      clientName: (user.user_metadata?.full_name as string | undefined) || "",
      plan,
      reference,
      amountKobo,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    if (!result.alreadyRecorded && email) {
      await setupAutoRenew(admin, { userId: user.id, email, plan, tx, renewsOn: result.renewsOn });
    }
    return NextResponse.json({ ok: true });
  }

  // A renewal charge from a Paystack subscription.
  const planCode = typeof tx.plan === "string" ? tx.plan : tx.plan?.plan_code;
  if (!planCode) return NextResponse.json({ ok: true, ignored: "not_ours" });
  const row = await findBilling(admin, { customerCode: tx.customer?.customer_code, email: tx.customer?.email });
  if (!row || !isPlanId(row.plan_id)) {
    console.error("[paystack webhook] renewal for unknown client:", { reference, customer: tx.customer?.customer_code });
    return NextResponse.json({ ok: true, ignored: "unknown_client" });
  }
  const plan = getPlan(row.plan_id);
  const result = await extendPaidPackage(admin, { userId: row.user_id, plan, reference, amountKobo });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  await admin
    .from("paystack_billing")
    .update({ last_failed_at: null, updated_at: new Date().toISOString() })
    .eq("user_id", row.user_id);
  return NextResponse.json({ ok: true });
}

async function paymentFailed(admin: ReturnType<typeof createAdminClient>, data: Record<string, unknown>, request: Request) {
  const sub = (data.subscription ?? {}) as { subscription_code?: string };
  const customer = (data.customer ?? {}) as { customer_code?: string; email?: string };
  const row = await findBilling(admin, { subscriptionCode: sub.subscription_code, customerCode: customer.customer_code, email: customer.email });
  if (!row) return NextResponse.json({ ok: true, ignored: "unknown_client" });

  // One email per failed period is enough.
  const lastFailed = row.last_failed_at ? new Date(row.last_failed_at).getTime() : 0;
  await admin
    .from("paystack_billing")
    .update({ last_failed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", row.user_id);
  if (Date.now() - lastFailed < 5 * 24 * 60 * 60 * 1000) return NextResponse.json({ ok: true, emailed: false });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || !isPlanId(row.plan_id)) return NextResponse.json({ ok: true, emailed: false });
  const plan = getPlan(row.plan_id);
  const site = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const packagesUrl = `${site}/portal/billing`;
  const link = (row.subscription_code && (await paystackManageLink(row.subscription_code))) || packagesUrl;
  const { data: userData } = await admin.auth.admin.getUserById(row.user_id);
  const to = userData?.user?.email || row.email;
  try {
    const { Resend } = await import("resend");
    await new Resend(resendKey).emails.send({
      from: senderFrom(),
      to,
      subject: `Your ${plan.name} payment didn't go through`,
      html: autopayFailedEmail({
        name: (userData?.user?.user_metadata?.full_name as string | undefined) || "",
        planName: plan.name,
        price: plan.price,
        priceSuffix: plan.priceSuffix ?? "",
        updateCardUrl: link,
        packagesUrl,
      }),
    });
  } catch (e) {
    console.error("[paystack webhook] failed-payment email:", e);
  }
  return NextResponse.json({ ok: true, emailed: true });
}
