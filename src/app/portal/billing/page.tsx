"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cardPaymentsEnabled, getPlan, isPlanId, type PlanId } from "@/lib/portal/billing";
import { PackagesGrid } from "@/components/PackagesGrid";
import {
  fetchSubscription,
  fetchInvoices,
  cancelSubscriptionPlan,
  type ClientSubscription,
  type ClientInvoice,
} from "@/lib/portal/subscriptions";
import { BrandLoader } from "@/components/BrandLoader";

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
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

  // A package picked on the Pricing page (?plan=…): offer to pay for it here.
  const pickedPlanId = searchParams.get("plan");
  const picked = isPlanId(pickedPlanId) && cardPaymentsEnabled() ? getPlan(pickedPlanId) : null;

  // After Korapay sends the client back, confirm the payment and activate
  // the package. "kpref" is our own reference added to the return address.
  useEffect(() => {
    const reference = searchParams.get("kpref") || searchParams.get("reference") || searchParams.get("trxref");
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
          setConfirmation(`Payment received — your ${data.planName} package is active. Welcome!`);
          load();
        } else if (data.error === "payment_not_successful") {
          setError("Your card payment wasn't completed, so nothing was charged. You can try again below.");
        } else {
          setError("We couldn't confirm your payment. If money left your account, message us on WhatsApp and we'll sort it out.");
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

  async function handleChoosePlan(planId: PlanId) {
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
        throw new Error(
          data.error === "card_payments_disabled"
            ? "Card payment isn't available yet — please use WhatsApp to get this package."
            : "We couldn't open the card payment page. Please try again in a moment."
        );
      }
      // Go to Korapay's secure payment page
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
    return <BrandLoader label="Loading billing details…" />;
  }

  const activePlan = subscription ? getPlan(subscription.planId) : null;
  const covered = activePlan
    ? [activePlan.covers.instagram && "Instagram", activePlan.covers.facebook && "Facebook", activePlan.covers.ads && "Meta advertising"].filter(Boolean)
    : [];

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Packages</h1>
        <p className="mt-1 text-sm text-ink-500">
          Your MetaShield package and billing history. Eligible recoveries covered by your package have no recovery fee.
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

      {picked && !confirmation && (!subscription || subscription.planId !== picked.id) ? (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-900">You picked {picked.name}</p>
            <p className="mt-0.5 text-sm text-ink-600">
              {picked.price} {picked.period === "lifetime" ? "one-time payment" : picked.priceSuffix} · paid securely by card
              through Korapay
            </p>
          </div>
          <Button onClick={() => handleChoosePlan(picked.id as PlanId)} disabled={busy} className="shrink-0">
            {busy ? "Please wait…" : `Pay ${picked.price}`}
          </Button>
        </div>
      ) : null}

      <Card className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Your package</p>
        {activePlan && subscription ? (
          <>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-semibold text-ink-900">{activePlan.name}</span>
                <span className="text-sm text-ink-500">
                  {activePlan.price} {activePlan.priceSuffix}
                </span>
              </div>
              <span className="rounded-full bg-risk-low-bg px-2.5 py-1 text-xs font-semibold text-risk-low">Active</span>
            </div>
            {covered.length ? (
              <p className="mt-2 text-sm text-ink-600">
                Recovery included for: <strong className="text-ink-900">{covered.join(" · ")}</strong>
              </p>
            ) : null}
            <p className="mt-1 text-sm text-ink-500">
              {subscription.renewsOn
                ? `Active until ${new Date(subscription.renewsOn).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}`
                : activePlan.period === "lifetime"
                  ? "Lifetime package — no renewal fees."
                  : null}
            </p>
            {activePlan.period !== "lifetime" ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={busy}>
                  {busy ? "Please wait…" : "Cancel package"}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p className="mt-2 text-lg font-semibold text-ink-900">No package yet</p>
            <p className="mt-1 text-sm text-ink-500">
              Choose a package below. Once it&apos;s active, eligible recoveries it covers have no recovery fee and no deposit.
            </p>
          </>
        )}
      </Card>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-ink-900">{activePlan ? "Change package" : "Choose a package"}</h2>
        <div className="mt-4">
          <PackagesGrid
            mode="portal"
            currentPlanId={subscription?.planId ?? null}
            busy={busy}
            onCheckout={handleChoosePlan}
          />
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
                  <th className="px-5 py-3 font-medium">Package</th>
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
