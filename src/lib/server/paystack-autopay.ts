// Turning automatic renewal on after a first Paystack card payment, and
// switching it off. Card codes are kept in paystack_billing, which only the
// server can read.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "@/lib/portal/billing";
import {
  createPaystackSubscription,
  disablePaystackSubscription,
  ensurePlanCode,
  paystackInterval,
  type PaystackTransaction,
} from "@/lib/server/paystack";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type BillingRow = {
  user_id: string;
  email: string;
  customer_code: string | null;
  authorization_code: string | null;
  card_brand: string | null;
  card_last4: string | null;
  card_exp: string | null;
  plan_id: string | null;
  plan_code: string | null;
  subscription_code: string | null;
  email_token: string | null;
  auto_renew: boolean;
  next_charge_on: string | null;
  last_failed_at: string | null;
};

export async function billingRowFor(admin: SupabaseClient, userId: string): Promise<BillingRow | null> {
  const { data, error } = await admin.from("paystack_billing").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("[paystack] billing read failed:", error.message);
    return null;
  }
  return (data as BillingRow | null) ?? null;
}

// Stops the client's current Paystack subscription, if there is one.
export async function stopAutoRenew(admin: SupabaseClient, userId: string): Promise<boolean> {
  const row = await billingRowFor(admin, userId);
  if (!row) return true;
  let ok = true;
  if (row.subscription_code && row.email_token && row.auto_renew) {
    const res = await disablePaystackSubscription(row.subscription_code, row.email_token);
    if (!res.status) {
      // Already disabled on Paystack's side counts as stopped.
      const msg = String(res.message ?? "").toLowerCase();
      ok = msg.includes("already") || msg.includes("not active") || msg.includes("inactive");
      if (!ok) console.error("[paystack] could not stop subscription:", res.message);
    }
  }
  if (ok) {
    await admin
      .from("paystack_billing")
      .update({ auto_renew: false, next_charge_on: null, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }
  return ok;
}

// After a successful first payment: save the card and start a Paystack
// subscription whose first automatic charge is the day before the paid
// period ends. Lifetime (one-off) stops any automatic renewal instead.
export async function setupAutoRenew(
  admin: SupabaseClient,
  input: { userId: string; email: string; plan: Plan; tx: PaystackTransaction; renewsOn: string | null },
): Promise<{ autoRenew: boolean }> {
  const { userId, email, plan, tx, renewsOn } = input;
  const auth = tx.authorization ?? {};
  const now = new Date();

  // Any earlier automatic renewal (another package, or the same one paid
  // again) is replaced by this one.
  await stopAutoRenew(admin, userId);

  const base = {
    user_id: userId,
    email,
    customer_code: tx.customer?.customer_code ?? null,
    authorization_code: auth.reusable ? auth.authorization_code ?? null : null,
    card_brand: auth.brand || auth.card_type || null,
    card_last4: auth.last4 ?? null,
    card_exp: auth.exp_month && auth.exp_year ? `${auth.exp_month}/${String(auth.exp_year).slice(-2)}` : null,
    plan_id: String(plan.id),
    plan_code: null as string | null,
    subscription_code: null as string | null,
    email_token: null as string | null,
    auto_renew: false,
    next_charge_on: null as string | null,
    last_failed_at: null as string | null,
    updated_at: now.toISOString(),
  };

  const interval = paystackInterval(plan);
  if (!interval || !renewsOn || !auth.reusable || !auth.authorization_code) {
    await admin.from("paystack_billing").upsert(base, { onConflict: "user_id" });
    return { autoRenew: false };
  }

  const planCode = await ensurePlanCode(plan);
  if (!planCode) {
    await admin.from("paystack_billing").upsert(base, { onConflict: "user_id" });
    return { autoRenew: false };
  }

  // Charge a day early so the package never lapses while the card is charged.
  const startMs = Math.max(new Date(renewsOn).getTime() - DAY, now.getTime() + HOUR);
  const startDate = new Date(startMs).toISOString();
  const sub = await createPaystackSubscription({
    customer: base.customer_code || email,
    planCode,
    authorization: auth.authorization_code,
    startDate,
  });
  if (!sub.status || !sub.data?.subscription_code) {
    console.error("[paystack] subscription create failed:", sub.message);
    await admin.from("paystack_billing").upsert({ ...base, plan_code: planCode }, { onConflict: "user_id" });
    return { autoRenew: false };
  }

  await admin.from("paystack_billing").upsert(
    {
      ...base,
      plan_code: planCode,
      subscription_code: sub.data.subscription_code,
      email_token: sub.data.email_token ?? null,
      auto_renew: true,
      next_charge_on: sub.data.next_payment_date ?? startDate,
    },
    { onConflict: "user_id" },
  );
  return { autoRenew: true };
}
