"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getPlan, hasFreeFirstMonth, isPlanId, type PlanId } from "@/lib/portal/billing";
import { FREE_MONTH_USED_MESSAGE, packageWhatsAppUrl, startPackage, startPackageCheckout } from "@/lib/portal/start-package";
import { PackagesGrid } from "@/components/PackagesGrid";
import Link from "next/link";
import { autoProtectFromHistory, fetchAccounts, fetchHealthChecks } from "@/lib/portal/data";
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

type Autopay = {
  available: boolean; // card payments renew automatically (Paystack set up)
  autoRenew: boolean;
  card: string | null; // e.g. "Visa •••• 4081"
  nextChargeOn: string | null;
  failed: boolean;
};

async function fetchAutopay(): Promise<Autopay | null> {
  try {
    const res = await fetch("/api/subscribe/autopay", { cache: "no-store" });
    return res.ok ? ((await res.json()) as Autopay) : null;
  } catch {
    return null;
  }
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function BillingPage() {
  const [subscription, setSubscriptionState] = useState<ClientSubscription | null | "loading">("loading");
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [freeMonthUsed, setFreeMonthUsed] = useState(false);
  const [autopay, setAutopay] = useState<Autopay | null>(null);
  // How many accounts they've checked / have protected — to ask "which
  // account?" when there are none.
  const [checkedCount, setCheckedCount] = useState<number | null>(null);
  const [protectedCount, setProtectedCount] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  // Just signed up after checking an account (?checked=@handle).
  const [checkedHandle] = useState<string | null>(() => searchParams.get("checked"));

  async function load() {
    const [sub, inv, ap, checks, accounts] = await Promise.all([
      fetchSubscription(),
      fetchInvoices(),
      fetchAutopay(),
      fetchHealthChecks(),
      fetchAccounts().catch(() => []),
    ]);
    setSubscriptionState(sub);
    setInvoices(inv);
    setAutopay(ap);
    setCheckedCount(checks.length);
    setProtectedCount(accounts.length);
  }

  useEffect(() => {
    load();
  }, []);

  // Just started the free trial (?free=watch): say so once.
  useEffect(() => {
    const freePlan = searchParams.get("free");
    if (!isPlanId(freePlan)) return;
    setConfirmation(
      `Your 2-week free trial of ${getPlan(freePlan).name} has started. Next: add your accounts for protection in My Accounts, then do your protection checklist on the dashboard.`
    );
    router.replace("/portal/billing");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A package picked on the Pricing page (?plan=…): offer to pay for it here,
  // and with &pay=1 (just signed in to buy it) go straight on to Korapay.
  const pickedPlanId = searchParams.get("plan");
  const picked = isPlanId(pickedPlanId) ? getPlan(pickedPlanId) : null;
  const autoPayStarted = useRef(false);
  useEffect(() => {
    if (!picked || searchParams.get("pay") !== "1" || autoPayStarted.current) return;
    if (searchParams.get("kpref") || searchParams.get("reference")) return;
    autoPayStarted.current = true;
    void handleChoosePlan(picked.id as PlanId, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          // The accounts they've already checked are protected straight away.
          void autoProtectFromHistory()
            .catch(() => [] as string[])
            .then((added) => {
              setConfirmation(
                added.length
                  ? `Payment received — your ${data.planName} package is active, and ${added.join(", ")} ${added.length > 1 ? "are" : "is"} now protected.`
                  : `Payment received — your ${data.planName} package is active.`,
              );
              return load();
            });
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

  // pay: straight to card payment. Otherwise Watch/Elite start the free
  // month when the client can still have it.
  async function handleChoosePlan(planId: PlanId, pay = true) {
    setError(null);
    setBusy(true);
    const message = pay ? await startPackageCheckout(getPlan(planId)) : await startPackage(getPlan(planId));
    if (message === "free_month_used") {
      setFreeMonthUsed(true);
      setError(FREE_MONTH_USED_MESSAGE);
      setBusy(false);
      return;
    }
    if (message) {
      setError(message);
      setBusy(false);
    }
    // Otherwise the page is moving on to Korapay (or WhatsApp).
  }

  async function handleUpdateCard() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/subscribe/autopay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_card" }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError("We couldn't open the card page. Please try again in a moment.");
    } catch {
      setError("We couldn't open the card page. Check your internet connection and try again.");
    }
    setBusy(false);
  }

  async function handleStopAutopay() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/subscribe/autopay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      if (!res.ok) throw new Error();
      await load();
      setConfirmation("Automatic payment is off. Your package stays on until its end date, and your card won't be charged again.");
    } catch {
      setError("We couldn't turn off automatic payment. Please try again, or message us on WhatsApp.");
    } finally {
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
  const inFreeMonth = subscription?.status === "trial";
  const canStartFree = !!picked && hasFreeFirstMonth(picked.id) && !subscription && !freeMonthUsed;
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
      {error === FREE_MONTH_USED_MESSAGE ? (
        <p className="mt-6 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-ink-700 ring-1 ring-brand-100">
          {error}{" "}
          <a href={packageWhatsAppUrl(getPlan(picked?.id ?? "watch"))} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">
            Questions? WhatsApp us
          </a>
        </p>
      ) : error ? (
        <p className="mt-6 rounded-xl bg-risk-high-bg px-4 py-3 text-sm font-medium text-risk-high">
          {error}
        </p>
      ) : null}

      {(() => {
        const hasPackage =
          !!subscription && (subscription.status === "active" || subscription.status === "trial");
        // Checked an account, then signed up: it's waiting to be protected.
        if (!hasPackage && checkedHandle && !confirmation) {
          return (
            <div className="mt-6 rounded-2xl border border-risk-low/30 bg-risk-low-bg p-5">
              <p className="text-sm font-semibold text-ink-900">Your health check for {checkedHandle} is saved</p>
              <p className="mt-0.5 text-sm text-ink-600">
                Choose a package below. As soon as it&apos;s active, {checkedHandle} is protected automatically — no need to
                check it again.
              </p>
            </div>
          );
        }
        // No account checked yet: ask which one they want to protect.
        if (checkedCount === 0 && (protectedCount ?? 0) === 0) {
          return (
            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-900">Which account do you want to protect?</p>
                <p className="mt-0.5 text-sm text-ink-600">
                  {hasPackage
                    ? "Run a quick health check on it (about 2 minutes). It's added to your package and protected automatically."
                    : "Run a quick health check on it first (about 2 minutes). Once you choose a package, it's protected automatically."}
                </p>
              </div>
              <Link
                href="/portal/accounts/new"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Check my account
              </Link>
            </div>
          );
        }
        return null;
      })()}

      {picked && !confirmation && (!subscription || subscription.planId !== picked.id) ? (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-900">You picked {picked.name}</p>
            <p className="mt-0.5 text-sm text-ink-600">
              {canStartFree
                ? `First 2 weeks free — no card needed. Then ${picked.price}${picked.priceSuffix ?? ""}.`
                : `${picked.price} ${picked.period === "lifetime" ? "one-time payment" : (picked.priceSuffix ?? "")} · paid securely by card`}
            </p>
          </div>
          <Button onClick={() => handleChoosePlan(picked.id as PlanId, !canStartFree)} disabled={busy} className="shrink-0">
            {busy ? (canStartFree ? "Starting…" : "Opening payment…") : canStartFree ? "Start my free trial" : `Pay ${picked.price}`}
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
              {inFreeMonth ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  🎁 Free trial
                </span>
              ) : (
                <span className="rounded-full bg-risk-low-bg px-2.5 py-1 text-xs font-semibold text-risk-low">Active</span>
              )}
            </div>
            {inFreeMonth ? (
              <div className="mt-4 rounded-xl bg-brand-50 p-4 ring-1 ring-brand-100">
                <p className="text-sm font-semibold text-ink-900">
                  Free until{" "}
                  {subscription.renewsOn
                    ? new Date(subscription.renewsOn).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                    : "the end of your free trial"}
                </p>
                <p className="mt-1 text-sm text-ink-600">
                  Pay {activePlan.price} before then to keep your protection. Account recovery at no extra cost starts with your first
                  payment. Your paid month starts when the free one ends — you don&apos;t lose any days.
                  {autopay?.available
                    ? ` After that, your card is charged ${activePlan.price} automatically each month until you cancel.`
                    : ""}
                </p>
                <Button onClick={() => handleChoosePlan(activePlan.id as PlanId, true)} disabled={busy} size="sm" className="mt-3">
                  {busy ? "Opening payment…" : `Pay ${activePlan.price} now`}
                </Button>
              </div>
            ) : covered.length ? (
              <p className="mt-2 text-sm text-ink-600">
                Recovery included for: <strong className="text-ink-900">{covered.join(" · ")}</strong>
              </p>
            ) : null}
            <p className="mt-1 text-sm text-ink-500">
              {inFreeMonth
                ? null
                : subscription.renewsOn
                ? `Active until ${new Date(subscription.renewsOn).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}`
                : activePlan.period === "lifetime"
                  ? "Lifetime package — no renewal fees."
                  : null}
            </p>
            {!inFreeMonth && activePlan.period !== "lifetime" && autopay?.available ? (
              autopay.autoRenew ? (
                <div className="mt-4 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
                  <p className="text-sm font-semibold text-ink-900">
                    Automatic payment is on{autopay.card ? ` · ${autopay.card}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-ink-600">
                    {autopay.nextChargeOn
                      ? `Next payment: ${activePlan.price} on ${longDate(autopay.nextChargeOn)}. `
                      : ""}
                    You don&apos;t need to do anything to keep your protection. Turn it off any time.
                  </p>
                  {autopay.failed ? (
                    <p className="mt-2 text-sm font-medium text-risk-high">
                      Your last automatic payment didn&apos;t go through. Update your card so your protection doesn&apos;t stop.
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleUpdateCard} disabled={busy}>
                      Change card
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleStopAutopay} disabled={busy}>
                      Turn off automatic payment
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
                  <p className="text-sm font-semibold text-ink-900">Automatic payment is off</p>
                  <p className="mt-1 text-sm text-ink-600">
                    {subscription.renewsOn ? `Your package ends on ${longDate(subscription.renewsOn)}. ` : ""}
                    Renew by card and it will renew automatically after that, so your protection never stops.
                  </p>
                  <Button size="sm" className="mt-3" onClick={() => handleChoosePlan(activePlan.id as PlanId, true)} disabled={busy}>
                    {busy ? "Opening payment…" : `Renew for ${activePlan.price}`}
                  </Button>
                </div>
              )
            ) : null}
            {activePlan.period !== "lifetime" ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={busy}>
                  {busy ? "Please wait…" : inFreeMonth ? "Stop free trial" : "Cancel package"}
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
            currentStatus={subscription?.status}
            freeMonthUsed={!!subscription || freeMonthUsed}
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
