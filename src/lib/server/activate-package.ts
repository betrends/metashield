// Switching a package on after a confirmed card payment (Korapay or
// Paystack), and extending it when Paystack renews it automatically.
// Used by /api/subscribe/verify (the client's return page) and by
// /api/paystack/webhook (Paystack's own notifications), so both follow the
// same rules and a payment is never counted twice.

import type { SupabaseClient } from "@supabase/supabase-js";
import { addFreeTrial, hasBonusMonth, planEndsOn, type Plan } from "@/lib/portal/billing";
import { subscriptionWelcomeEmail } from "@/lib/email-templates";
import { sendProtectionChecklist, startsNewProtection } from "@/lib/server/protection-checklist";
import { withSenderName } from "@/lib/server/sender";

type Existing = { id: string; plan_id: string; status: string; renews_on: string | null } | null;

export type ActivateResult =
  | { ok: true; alreadyRecorded: boolean; renewsOn: string | null; subscriptionId: string | null; checklistSent: boolean }
  | { ok: false; error: string };

// Claims a payment reference so it is processed once. Returns false when it
// was already processed. If the payment_events table isn't there yet
// (migration not run), processing goes ahead and the invoice check below
// still prevents most repeats.
async function claimReference(admin: SupabaseClient, reference: string, kind: string, userId: string): Promise<boolean> {
  const { error } = await admin.from("payment_events").insert({ reference, kind, user_id: userId });
  if (!error) return true;
  if (error.code === "23505") return false;
  console.error("[payments] could not record payment reference (continuing):", error.message);
  return true;
}

async function releaseReference(admin: SupabaseClient, reference: string) {
  await admin.from("payment_events").delete().eq("reference", reference);
}

async function alreadyInvoiced(admin: SupabaseClient, reference: string): Promise<boolean> {
  const { data } = await admin.from("invoices").select("id").eq("paystack_reference", reference).maybeSingle();
  return !!data;
}

export async function activatePaidPackage(
  admin: SupabaseClient,
  input: { userId: string; email: string | null; clientName: string; plan: Plan; reference: string; amountKobo: number },
): Promise<ActivateResult> {
  const { userId, plan, reference } = input;

  if (await alreadyInvoiced(admin, reference)) {
    return { ok: true, alreadyRecorded: true, renewsOn: null, subscriptionId: null, checklistSent: false };
  }
  if (!(await claimReference(admin, reference, "first_payment", userId))) {
    return { ok: true, alreadyRecorded: true, renewsOn: null, subscriptionId: null, checklistSent: false };
  }

  const { data: existingRow } = await admin
    .from("subscriptions")
    .select("id, plan_id, status, renews_on")
    .eq("user_id", userId)
    .maybeSingle();
  const existing = existingRow as Existing;

  // Monthly packages run a month, Annual a year, Lifetime never ends.
  // Renewing the same package early adds the new period on top of what's
  // left, so the client doesn't lose days.
  const now = new Date();
  // Decided before the package is switched on: a new start gets the checklist.
  const isNewProtection = startsNewProtection(existing, now);
  const currentEnd = existing?.renews_on ? new Date(existing.renews_on) : null;
  const extendFrom =
    (existing?.status === "active" && existing.plan_id === plan.id && currentEnd && currentEnd > now) ||
    // Paying during the free trial: the paid period starts when it ends.
    (existing?.status === "trial" && currentEnd && currentEnd > now)
      ? (currentEnd as Date)
      : now;
  let renewsOn = planEndsOn(plan, extendFrom);
  // Annual bonus: a new client's first payment gets 2 extra weeks.
  if (!existing && hasBonusMonth(plan.id) && renewsOn) renewsOn = addFreeTrial(renewsOn);

  let subscriptionId: string;
  if (existing) {
    const { error } = await admin
      .from("subscriptions")
      .update({ plan_id: plan.id, status: "active", renews_on: renewsOn, updated_at: now.toISOString() })
      .eq("id", existing.id);
    if (error) {
      console.error("Failed to activate subscription:", error);
      await releaseReference(admin, reference);
      return { ok: false, error: "db_error" };
    }
    subscriptionId = existing.id;
  } else {
    const { data: inserted, error } = await admin
      .from("subscriptions")
      .insert({ user_id: userId, plan_id: plan.id, status: "active", renews_on: renewsOn })
      .select("id")
      .single();
    if (error || !inserted) {
      console.error("Failed to create subscription:", error);
      await releaseReference(admin, reference);
      return { ok: false, error: "db_error" };
    }
    subscriptionId = inserted.id as string;
  }

  const { error: invoiceError } = await admin.from("invoices").insert({
    user_id: userId,
    subscription_id: subscriptionId,
    amount_kobo: input.amountKobo || plan.priceKobo,
    currency: "NGN",
    status: "paid",
    paystack_reference: reference,
  });
  if (invoiceError) {
    // The plan is active; only the history row is missing.
    console.error("Subscription activated but invoice insert failed:", invoiceError, { reference });
  }

  // Welcome email
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress = withSenderName(process.env.RESEND_FROM_EMAIL);
  if (resendKey && fromAddress && input.email) {
    try {
      const { Resend } = await import("resend");
      await new Resend(resendKey).emails.send({
        from: fromAddress,
        to: input.email,
        subject: `Welcome to ${plan.name}`,
        html: subscriptionWelcomeEmail({
          clientName: input.clientName || input.email.split("@")[0],
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

  // The compulsory "keep your account protected" checklist, once per new start.
  let checklistSent = false;
  if (isNewProtection && input.email) {
    checklistSent = await sendProtectionChecklist({ to: input.email, clientName: input.clientName, planName: plan.name });
  }

  return { ok: true, alreadyRecorded: false, renewsOn, subscriptionId, checklistSent };
}

// An automatic renewal charge went through: add one more period, starting
// from the end of the current one (or from today if it already ended).
export async function extendPaidPackage(
  admin: SupabaseClient,
  input: { userId: string; plan: Plan; reference: string; amountKobo: number },
): Promise<ActivateResult> {
  const { userId, plan, reference } = input;
  if (await alreadyInvoiced(admin, reference)) {
    return { ok: true, alreadyRecorded: true, renewsOn: null, subscriptionId: null, checklistSent: false };
  }
  if (!(await claimReference(admin, reference, "renewal", userId))) {
    return { ok: true, alreadyRecorded: true, renewsOn: null, subscriptionId: null, checklistSent: false };
  }

  const { data: existingRow } = await admin
    .from("subscriptions")
    .select("id, plan_id, status, renews_on")
    .eq("user_id", userId)
    .maybeSingle();
  const existing = existingRow as Existing;
  const now = new Date();
  const currentEnd = existing?.renews_on ? new Date(existing.renews_on) : null;
  const from = currentEnd && currentEnd > now ? currentEnd : now;
  const renewsOn = planEndsOn(plan, from);

  let subscriptionId: string;
  if (existing) {
    const { error } = await admin
      .from("subscriptions")
      .update({ plan_id: plan.id, status: "active", renews_on: renewsOn, updated_at: now.toISOString() })
      .eq("id", existing.id);
    if (error) {
      console.error("[paystack] renewal update failed:", error);
      await releaseReference(admin, reference);
      return { ok: false, error: "db_error" };
    }
    subscriptionId = existing.id;
  } else {
    const { data: inserted, error } = await admin
      .from("subscriptions")
      .insert({ user_id: userId, plan_id: plan.id, status: "active", renews_on: renewsOn })
      .select("id")
      .single();
    if (error || !inserted) {
      console.error("[paystack] renewal insert failed:", error);
      await releaseReference(admin, reference);
      return { ok: false, error: "db_error" };
    }
    subscriptionId = inserted.id as string;
  }

  const { error: invoiceError } = await admin.from("invoices").insert({
    user_id: userId,
    subscription_id: subscriptionId,
    amount_kobo: input.amountKobo || plan.priceKobo,
    currency: "NGN",
    status: "paid",
    paystack_reference: reference,
  });
  if (invoiceError) console.error("[paystack] renewal invoice insert failed:", invoiceError, { reference });

  return { ok: true, alreadyRecorded: false, renewsOn, subscriptionId, checklistSent: false };
}
