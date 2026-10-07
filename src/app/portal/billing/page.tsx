"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { plans, getPlan } from "@/lib/portal/billing";
import {
  fetchSubscription,
  fetchInvoices,
  cancelSubscriptionPlan,
  type ClientSubscription,
  type ClientInvoice,
} from "@/lib/portal/subscriptions";

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

function CardBrandIcon() {
  return (
    <svg width="34" height="24" viewBox="0 0 34 24" fill="none" aria-hidden="true">
      <rect width="34" height="24" rx="4" fill="#1E1B4B" />
      <circle cx="13" cy="12" r="7" fill="#EF4444" fillOpacity="0.85" />
      <circle cx="21" cy="12" r="7" fill="#F59E0B" fillOpacity="0.85" />
    </svg>
  );
}

export default function BillingPage() {
  const [subscription, setSubscriptionState] = useState<ClientSubscription | null | "loading">("loading");
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  async function load() {
    const [sub, inv] = await Promise.all([fetchSubscription(), fetchInvoices()]);
    setSubscriptionState(sub);
    setInvoices(inv);
  }

  useEffect(() => {
    load();
  }, []);

  // After Paystack redirects back, verify the payment and activate the plan
  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (!reference) return;
    setBusy(true);
    fetch("/api/subscribe/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setConfirmation(`You're now subscribed to the ${data.planName} plan. Welcome!`);
          load();
        } else {
          setError("Payment verification failed — please contact support if you were charged.");
        }
      })
      .catch(() => setError("Could not verify payment — please contact support."))
      .finally(() => {
        setBusy(false);
        // Remove the reference from the URL so refreshing doesn't re-verify
        router.replace("/portal/billing");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleChoosePlan(planId: "basic" | "professional" | "business" | "one_time") {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Could not start checkout.");
      }
      // Redirect to Paystack checkout
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  async function handleCancel() {
    setError(null);
    setBusy(true);
    try {
      await cancelSubscriptionPlan();
      await load();
      setConfirmation("Your subscription has been cancelled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (subscription === "loading") {
    return <p className="text-sm text-ink-400">Loading billing details…</p>;
  }

  const activePlan = subscription ? getPlan(subscription.planId) : null;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Subscriptions</h1>
        <p className="mt-1 text-sm text-ink-500">
          Manage your Account Protection subscription and billing history.
        </p>
      </div>

      {confirmation ? (
        <div className="mt-6 flex items-center justify-between rounded-xl bg-risk-low-bg px-4 py-3 text-sm font-medium text-risk-low">
          {confirmation}
          <button
            onClick={() => setConfirmation(null)}
            aria-label="Dismiss"
            className="text-risk-low/70 hover:text-risk-low"
          >
            ✕
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="mt-6 rounded-xl bg-risk-high-bg px-4 py-3 text-sm font-medium text-risk-high">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Current plan */}
        <Card className="lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Current plan</p>
          {activePlan && subscription ? (
            <>
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-ink-900">{activePlan.name}</span>
                  <span className="text-sm text-ink-500">
                    {activePlan.price}
                    {activePlan.priceSuffix}
                  </span>
                </div>
                <span className="rounded-full bg-risk-low-bg px-2.5 py-1 text-xs font-semibold text-risk-low">
                  Active
                </span>
              </div>
              {subscription.renewsOn ? (
                <p className="mt-1 text-sm text-ink-500">
                  Next billing date:{" "}
                  {new Date(subscription.renewsOn).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={busy}>
                  {busy ? "Please wait…" : "Cancel subscription"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-lg font-semibold text-ink-900">No active subscription</p>
              <p className="mt-1 text-sm text-ink-500">
                Choose a plan below to enroll your accounts in ongoing Account Protection.
              </p>
            </>
          )}
        </Card>

        {/* Payment method */}
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Payment method</p>
          <div className="mt-3 flex items-center gap-3">
            <CardBrandIcon />
            <div>
              <p className="text-sm font-semibold text-ink-900">•••• •••• •••• 4242</p>
              <p className="text-xs text-ink-400">Expires 12/28</p>
            </div>
          </div>
          <button
            className="mt-4 text-sm font-semibold text-brand-700 hover:text-brand-800"
            title="Real card billing isn't connected yet"
            onClick={() =>
              setConfirmation("Real card billing isn't connected yet — check back soon.")
            }
          >
            Update payment method →
          </button>
        </Card>
      </div>

      {/* Plan picker */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-ink-900">
          {activePlan ? "Change plan" : "Choose a plan"}
        </h2>
        <div className="mt-4 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = subscription?.planId === plan.id;
            return (
              <Card
                key={plan.id}
                className={isCurrent ? "ring-2 ring-brand-500" : ""}
              >
                <h3 className="text-base font-semibold text-ink-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-ink-500">{plan.description}</p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tracking-tight text-ink-900">
                    {plan.price}
                  </span>
                  {plan.priceSuffix ? (
                    <span className="text-sm text-ink-500">{plan.priceSuffix}</span>
                  ) : null}
                </div>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink-600">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" viewBox="0 0 24 24" fill="none">
                        <path
                          d="m5 13 4 4L19 7"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={isCurrent ? "outline" : "primary"}
                  disabled={isCurrent || busy}
                  onClick={() => handleChoosePlan(plan.id)}
                >
                  {isCurrent ? "Current plan" : busy ? "Please wait…" : "Subscribe"}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Invoice history */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-ink-900">Billing history</h2>
        <Card className="mt-4 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-ink-400">
                      No invoices yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-ink-100 last:border-b-0">
                      <td className="px-5 py-3.5 font-medium text-ink-800">
                        {inv.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-5 py-3.5 text-ink-600">{inv.date}</td>
                      <td className="px-5 py-3.5 text-ink-600">
                        {inv.planId ? getPlan(inv.planId).name : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-ink-600">{formatNaira(inv.amountKobo)}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            inv.status === "paid"
                              ? "bg-risk-low-bg text-risk-low"
                              : inv.status === "pending"
                                ? "bg-risk-medium-bg text-risk-medium"
                                : "bg-risk-high-bg text-risk-high"
                          }`}
                        >
                          {inv.status[0].toUpperCase() + inv.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
