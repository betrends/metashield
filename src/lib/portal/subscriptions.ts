"use client";

// Real subscription/invoice reads for the signed-in client. Writes go
// through /api/subscribe (see that route for why: RLS intentionally has
// no insert/update policy for subscriptions/invoices — only the
// service-role-backed API route can activate or cancel one).

import { createClient } from "@/lib/supabase/client";
import type { AnyPlanId as PlanId } from "@/lib/portal/billing";

export type ClientSubscription = {
  planId: PlanId;
  status: "active" | "cancelled";
  renewsOn: string | null;
};

export type ClientInvoice = {
  id: string;
  date: string;
  amountKobo: number;
  status: "paid" | "failed" | "pending";
  planId: PlanId | null;
};

type SubscriptionRow = {
  plan_id: PlanId;
  status: "active" | "cancelled";
  renews_on: string | null;
};

export async function fetchSubscription(): Promise<ClientSubscription | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan_id, status, renews_on")
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as SubscriptionRow;
  // A package whose paid period has ended no longer counts as active.
  if (row.renews_on && new Date(row.renews_on).getTime() < Date.now()) return null;
  return { planId: row.plan_id, status: row.status, renewsOn: row.renews_on };
}

type InvoiceRow = {
  id: string;
  amount_kobo: number;
  status: "paid" | "failed" | "pending";
  created_at: string;
  subscriptions: { plan_id: PlanId } | { plan_id: PlanId }[] | null;
};

export async function fetchInvoices(): Promise<ClientInvoice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id, amount_kobo, status, created_at, subscriptions(plan_id)")
    .not("subscription_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as InvoiceRow[]).map((row) => {
    const sub = Array.isArray(row.subscriptions) ? row.subscriptions[0] : row.subscriptions;
    return {
      id: row.id,
      amountKobo: row.amount_kobo,
      status: row.status,
      planId: sub?.plan_id ?? null,
      date: new Date(row.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  });
}

export async function chooseSubscriptionPlan(planId: PlanId): Promise<void> {
  const res = await fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Couldn't update your plan — please try again.");
  }
}

export async function cancelSubscriptionPlan(): Promise<void> {
  const res = await fetch("/api/subscribe/cancel", { method: "POST" });
  if (!res.ok) {
    throw new Error("Couldn't cancel — please try again.");
  }
}
