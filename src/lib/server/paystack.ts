// Paystack: card checkout plus automatic renewals (server only).
//
// How a monthly package is paid:
// 1. The client pays the first period by card on Paystack's checkout
//    (/api/subscribe → transaction/initialize, card only so the card can be
//    charged again).
// 2. On success (return page or Paystack's notification, whichever comes
//    first) the package is switched on and a Paystack subscription is
//    created on the saved card, starting the day before the paid period
//    ends. Paystack then charges the card every month (or year).
// 3. Each renewal charge reaches /api/paystack/webhook, which extends the
//    package by one period.
//
// Turned on by setting PAYSTACK_SECRET_KEY in Vercel. Set
// NEXT_PUBLIC_PAYSTACK_ENABLED to "false" to switch it off without removing
// the key (card checkout then falls back to Korapay, if set up).

import crypto from "node:crypto";
import type { Plan } from "@/lib/portal/billing";

const API = "https://api.paystack.co";

export function paystackEnabled(): boolean {
  return !!process.env.PAYSTACK_SECRET_KEY && process.env.NEXT_PUBLIC_PAYSTACK_ENABLED !== "false";
}

// Our own payment references for Paystack start with "msp-" (Korapay's
// start with "ms-"), so the return page knows which one to ask.
export function newPaystackReference(): string {
  return `msp-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}
export function isPaystackReference(ref: string): boolean {
  return ref.startsWith("msp-");
}

type PaystackResponse<T> = { status: boolean; message?: string; data?: T; meta?: unknown };

export async function paystack<T = Record<string, unknown>>(
  path: string,
  init: { method?: "GET" | "POST" | "PUT"; body?: unknown } = {},
): Promise<PaystackResponse<T>> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) return { status: false, message: "PAYSTACK_SECRET_KEY not configured" };
  try {
    const res = await fetch(API + path, {
      method: init.method ?? "GET",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    return (await res.json()) as PaystackResponse<T>;
  } catch (e) {
    return { status: false, message: `Could not reach Paystack: ${String(e)}` };
  }
}

// Paystack signs every notification with the secret key (HMAC SHA-512).
export function validPaystackSignature(rawBody: string, signature: string | null): boolean {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !signature) return false;
  const expected = crypto.createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Plans ──────────────────────────────────────────────────────────────
// Each package has a matching Paystack plan (same name and price). It is
// found by name, or created the first time it is needed, so nothing has to
// be set up by hand in the Paystack dashboard. A price change creates a new
// plan; existing subscriptions keep their old price until renewed by hand.

type PaystackPlan = { plan_code: string; name: string; amount: number; interval: string; is_deleted?: boolean; is_archived?: boolean };
const planCodeCache = new Map<string, string>();

export function paystackInterval(plan: Plan): "monthly" | "annually" | null {
  if (plan.period === "month") return "monthly";
  if (plan.period === "year") return "annually";
  return null;
}

export async function ensurePlanCode(plan: Plan): Promise<string | null> {
  const interval = paystackInterval(plan);
  if (!interval) return null;
  const name = `${plan.name} (${interval})`;
  const cacheKey = `${name}:${plan.priceKobo}`;
  const cached = planCodeCache.get(cacheKey);
  if (cached) return cached;

  const list = await paystack<PaystackPlan[]>(`/plan?perPage=100&interval=${interval}&amount=${plan.priceKobo}`);
  const found = (list.data ?? []).find(
    (p) => p.name === name && p.amount === plan.priceKobo && p.interval === interval && !p.is_deleted && !p.is_archived,
  );
  if (found) {
    planCodeCache.set(cacheKey, found.plan_code);
    return found.plan_code;
  }
  const created = await paystack<PaystackPlan>("/plan", {
    method: "POST",
    body: { name, interval, amount: plan.priceKobo, currency: "NGN", send_invoices: true, send_sms: false },
  });
  if (!created.status || !created.data?.plan_code) {
    console.error("[paystack] plan create failed:", created.message);
    return null;
  }
  planCodeCache.set(cacheKey, created.data.plan_code);
  return created.data.plan_code;
}

// ── Transactions ───────────────────────────────────────────────────────

export type PaystackAuthorization = {
  authorization_code?: string;
  reusable?: boolean;
  channel?: string;
  card_type?: string;
  brand?: string;
  last4?: string;
  exp_month?: string;
  exp_year?: string;
};

export type PaystackTransaction = {
  id?: number;
  status?: string;
  reference?: string;
  amount?: number; // kobo
  currency?: string;
  paid_at?: string;
  channel?: string;
  metadata?: Record<string, unknown> | string | null;
  authorization?: PaystackAuthorization;
  customer?: { email?: string; customer_code?: string };
  plan?: { plan_code?: string } | string | null;
};

export async function verifyPaystackTransaction(reference: string) {
  return paystack<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

// Paystack sometimes sends metadata as a JSON string.
export function metadataOf(tx: PaystackTransaction): Record<string, unknown> {
  const m = tx.metadata;
  if (!m) return {};
  if (typeof m === "string") {
    try {
      const parsed = JSON.parse(m);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return m;
}

// ── Subscriptions ──────────────────────────────────────────────────────

type PaystackSubscription = { subscription_code?: string; email_token?: string; next_payment_date?: string; status?: string };

export async function createPaystackSubscription(input: {
  customer: string; // customer code or email
  planCode: string;
  authorization: string;
  startDate: string; // ISO — first automatic charge
}) {
  return paystack<PaystackSubscription>("/subscription", {
    method: "POST",
    body: { customer: input.customer, plan: input.planCode, authorization: input.authorization, start_date: input.startDate },
  });
}

export async function disablePaystackSubscription(code: string, token: string) {
  return paystack("/subscription/disable", { method: "POST", body: { code, token } });
}

// A Paystack page where the client can change the card on their package.
export async function paystackManageLink(code: string): Promise<string | null> {
  const res = await paystack<{ link?: string }>(`/subscription/${encodeURIComponent(code)}/manage/link`);
  return res.status && res.data?.link ? res.data.link : null;
}
