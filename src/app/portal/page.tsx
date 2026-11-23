"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { EmergencyModal } from "@/components/portal/EmergencyModal";
import { HealthCheckHistory } from "@/components/portal/HealthCheckHistory";
import { supportChannels } from "@/components/portal/ContactSupportMenu";
import {
  autoProtectFromHistory,
  fetchAccounts,
  fetchCases,
  fetchHealthChecks,
  migratePendingLocalRecords,
  type PortalAccount,
  type PortalCase,
  type PortalHealthCheck,
} from "@/lib/portal/data";
import { fetchSubscription, type ClientSubscription } from "@/lib/portal/subscriptions";
import { createClient } from "@/lib/supabase/client";
import { BrandLoader } from "@/components/BrandLoader";
import { recoveryWhatsappUrl } from "@/lib/site-config";
import { getPlan } from "@/lib/portal/billing";
import { CHECKLIST_DO } from "@/lib/protection-steps";
import { coveredAccountIds } from "@/lib/portal/account-limits";
import { CHECKLIST_TOTAL, fetchChecklistDone, healthWithChecklist, setChecklistStep } from "@/lib/portal/checklist";
import type { InstagramStep } from "@/lib/instagram-links";

function healthColor(score: number) {
  if (score >= 70) return { bar: "bg-risk-low", text: "text-risk-low" };
  if (score >= 40) return { bar: "bg-risk-medium", text: "text-risk-medium" };
  return { bar: "bg-risk-high", text: "text-risk-high" };
}

// Platform logo tile for the account rows.
function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p.includes("instagram")) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f58529] sm:h-12 sm:w-12 via-[#dd2a7b] to-[#8134af] text-white">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
        </svg>
      </span>
    );
  }
  if (p.includes("facebook")) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1877f2] text-white sm:h-12 sm:w-12">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21h2.9Z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-xs font-bold text-brand-700">
      {platform.slice(0, 2).toUpperCase()}
    </span>
  );
}

// "2 days ago", "today" — when the account's health check was saved.
function checkedAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PortalOverviewPage() {
  const [accounts, setAccounts] = useState<PortalAccount[] | "loading">("loading");
  const [cases, setCases] = useState<PortalCase[] | "loading">("loading");
  const [subscription, setSubscription] = useState<ClientSubscription | null | "loading">("loading");
  const [userName, setUserName] = useState<string>("");
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [checklistDone, setChecklistDone] = useState<Set<InstagramStep>>(new Set());
  const [savingStep, setSavingStep] = useState<InstagramStep | null>(null);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [healthChecks, setHealthChecks] = useState<PortalHealthCheck[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  async function toggleStep(step: InstagramStep) {
    const done = !checklistDone.has(step);
    setSavingStep(step);
    setChecklistError(null);
    // Update straight away so the score moves as they tick; undo if saving fails.
    setChecklistDone((prev) => {
      const next = new Set(prev);
      if (done) next.add(step);
      else next.delete(step);
      return next;
    });
    try {
      await setChecklistStep(step, done);
    } catch {
      setChecklistDone((prev) => {
        const next = new Set(prev);
        if (done) next.delete(step);
        else next.add(step);
        return next;
      });
      setChecklistError("That didn't save. Check your connection and try again.");
    } finally {
      setSavingStep(null);
    }
  }

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (user) {
          const name =
            (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
            user.email?.split("@")[0] ||
            "";
          setUserName(name);
        }
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await migratePendingLocalRecords();
      const [accountsResult, casesResult, subscriptionResult, doneResult, checksResult] = await Promise.all([
        fetchAccounts(),
        fetchCases(),
        fetchSubscription(),
        fetchChecklistDone(),
        fetchHealthChecks(),
      ]);
      if (cancelled) return;
      setHealthChecks(checksResult);
      // Has a package but nothing protected yet (e.g. the package was
      // switched on by the team): protect the accounts they've checked.
      const hasPackage =
        !!subscriptionResult && (subscriptionResult.status === "active" || subscriptionResult.status === "trial");
      if (hasPackage && accountsResult.length === 0 && checksResult.some((c) => !c.accountId) && reloadKey === 0) {
        const added = await autoProtectFromHistory().catch(() => [] as string[]);
        if (added.length && !cancelled) {
          setReloadKey((k) => k + 1);
          return;
        }
      }
      setChecklistDone(doneResult);
      setAccounts(accountsResult);
      setCases(casesResult);
      setSubscription(subscriptionResult);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (accounts === "loading" || cases === "loading" || subscription === "loading") {
    return <BrandLoader size="page" label="Loading your dashboard…" />;
  }

  // "active" = paid package; "trial" = free first month (protection on,
  // free recovery starts after the first payment).
  const isPaid = subscription?.status === "active";
  const inFreeMonth = subscription?.status === "trial";
  const isProtected = isPaid || inFreeMonth;
  const planShort = subscription ? getPlan(subscription.planId).name.replace(/^MetaShield\s+/, "") : "";
  const renewDate = subscription?.renewsOn
    ? new Date(subscription.renewsOn).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  // Health goes up as checklist steps are ticked (lib/portal/checklist.ts)
  // — the checklist comes with a package, so only then.
  const doneCount = isProtected ? checklistDone.size : 0;
  // Protected accounts if there are any; otherwise the latest check of each
  // account in their check history.
  const latestChecks = healthChecks.filter(
    (c, i) => healthChecks.findIndex((d) => d.handle === c.handle && d.platform === c.platform) === i,
  );
  const scored: { health: number }[] = accounts.length > 0 ? accounts : latestChecks;
  const hasScore = scored.length > 0;
  const baseHealth = hasScore ? Math.round(scored.reduce((sum, a) => sum + a.health, 0) / scored.length) : 0;
  const averageHealth = healthWithChecklist(baseHealth, doneCount);
  const checklistBoost = averageHealth - baseHealth;
  const hc = healthColor(averageHealth);
  const covered = coveredAccountIds(accounts, subscription);

  return (
    <div>
      {/* Welcome */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-[1.75rem]">
            {userName ? `Welcome back, ${userName}` : "Welcome back"} <span aria-hidden="true">✨</span>
          </h1>
          <p className="mt-1 text-sm text-ink-500">Here&apos;s the status of your protected accounts.</p>
        </div>
      </div>

      {/* Summary: protected accounts, plan, status */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link href="/portal/accounts" className="group">
          <Card className="flex h-full items-center gap-4 p-4 transition-colors group-hover:border-brand-300 sm:p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.7" />
                <path d="M5 20c1-3.6 4-5.2 7-5.2s6 1.6 7 5.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium text-ink-600">Protected accounts</p>
              <p className="mt-0.5 text-3xl font-semibold text-ink-900">{covered.size}</p>
            </div>
          </Card>
        </Link>
        <Link href="/portal/billing" className="group">
          <Card className="flex h-full items-center gap-4 p-4 transition-colors group-hover:border-brand-300 sm:p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium text-ink-600">Plan</p>
              <p className="mt-0.5 text-xl font-semibold text-ink-900">{isProtected ? planShort : "None yet"}</p>
              <p className="text-xs text-ink-500">
                {isProtected
                  ? inFreeMonth
                    ? `Free trial${renewDate ? ` · ends ${renewDate}` : ""}`
                    : renewDate
                      ? `Renews ${renewDate}`
                      : "No renewal needed"
                  : "Choose a package →"}
              </p>
            </div>
          </Card>
        </Link>
        <Card className="flex h-full items-center gap-4 p-4 sm:p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="m8.5 12.2 2.4 2.4 4.6-4.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-ink-600">Status</p>
            <span
              className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                isPaid
                  ? "bg-risk-low-bg text-risk-low ring-risk-low/30"
                  : inFreeMonth
                    ? "bg-brand-50 text-brand-700 ring-brand-200"
                    : "bg-ink-100 text-ink-600 ring-ink-200"
              }`}
            >
              <span aria-hidden="true">◆</span>
              {isPaid ? "Active" : inFreeMonth ? "Free trial" : "Not protected"}
            </span>
          </div>
        </Card>
      </div>

      {/* Health + checklist progress */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link href="/portal/accounts" className="group">
          <Card className="h-full p-5 transition-colors group-hover:border-brand-300">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-ink-600">Account health</p>
              <p className="text-xs text-ink-500">
                {!hasScore
                  ? "Run a health check →"
                  : !isProtected
                    ? "From your latest health check"
                    : checklistBoost > 0
                      ? `+${checklistBoost} from your checklist`
                      : "Tick off your checklist to raise it"}
              </p>
            </div>
            <p className={`mt-2 text-3xl font-semibold ${hasScore ? hc.text : "text-ink-400"}`}>
              {hasScore ? averageHealth : "—"}
              <span className="text-sm font-normal text-ink-400">/100</span>
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-100">
              <div className={`h-full rounded-full ${hc.bar} transition-all duration-700`} style={{ width: `${hasScore ? averageHealth : 0}%` }} />
            </div>
          </Card>
        </Link>
        {!isProtected ? (
          <Link href="/portal/billing" className="group">
            <Card className="h-full border-brand-200 bg-brand-50 p-5 transition-colors group-hover:border-brand-400">
              <p className="text-sm font-semibold text-ink-900">Protect your accounts</p>
              <p className="mt-1 text-sm text-ink-600">
                Monthly checks, your protection checklist, and account recovery at no extra cost if anything happens.
                From ₦10,000/month.
              </p>
              <span className="mt-3 inline-flex rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                Choose a package
              </span>
            </Card>
          </Link>
        ) : (
        <a href="#checklist" className="group">
          <Card className="h-full p-5 transition-colors group-hover:border-brand-300">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-ink-600">Protection checklist</p>
              <p className="text-xs text-brand-700">
                {doneCount === CHECKLIST_TOTAL ? "All done — well protected" : "Each step raises your health →"}
              </p>
            </div>
            <p className="mt-2 text-3xl font-semibold text-ink-900">
              {doneCount}
              <span className="text-sm font-normal text-ink-400"> of {CHECKLIST_TOTAL} done</span>
            </p>
            <div className="mt-3 flex gap-1.5" aria-hidden="true">
              {CHECKLIST_DO.map((step) => (
                <span
                  key={step.ig}
                  className={`h-2 flex-1 rounded-full transition-colors duration-500 ${checklistDone.has(step.ig) ? "bg-risk-low" : "bg-ink-100"}`}
                />
              ))}
            </div>
          </Card>
        </a>
        )}
      </div>

      {/* My Accounts */}
      <div className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink-900">My Accounts</h2>
          <ButtonLink href="/portal/accounts/new" size="sm">
            + Add Account
          </ButtonLink>
        </div>
        {accounts.length === 0 ? (
          <Card className="mt-4 flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-ink-500">
              {!isProtected
                ? healthChecks.length
                  ? "No protected accounts yet. Choose a package, then add accounts from your check history below."
                  : "No protected accounts yet. Run a health check to see how safe your account is."
                : healthChecks.length
                  ? "No protected accounts yet. Add one from your check history below."
                  : "No accounts added yet."}
            </p>
            {!isProtected && healthChecks.length ? (
              <ButtonLink href="/portal/billing" size="sm">Choose a package</ButtonLink>
            ) : (
              <ButtonLink href="/portal/accounts/new" size="sm">Run an Account Health Check</ButtonLink>
            )}
          </Card>
        ) : (
          <div className="mt-4 space-y-3">
            {accounts.map((account) => {
              const isCovered = covered.has(account.id);
              const p = account.platform.toLowerCase();
              return (
                <Card key={account.id} className="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5">
                  <PlatformIcon platform={account.platform} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink-900">
                      {p.includes("instagram") ? "Instagram" : p.includes("facebook") ? "Facebook" : account.platform}
                    </p>
                    <p className="truncate text-sm text-ink-500">{account.handle}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 max-sm:px-2 max-sm:text-[11px] ${
                      isCovered ? "bg-risk-low-bg text-risk-low ring-risk-low/30" : "bg-risk-medium-bg text-risk-medium ring-risk-medium/30"
                    }`}
                  >
                    <span aria-hidden="true" className="max-sm:hidden">◆</span>
                    {isCovered ? "Protected" : "Not covered"}
                  </span>
                  <div className="hidden w-40 text-sm md:block">
                    <p className="font-medium text-ink-800">Health {healthWithChecklist(account.health, doneCount)}/100</p>
                    {account.createdAt && <p className="text-xs text-ink-500">Last check: {checkedAgo(account.createdAt)}</p>}
                  </div>
                  <Link
                    href={`/portal/accounts/${account.id}`}
                    className="shrink-0 rounded-xl border border-ink-200 px-3.5 py-2 text-sm font-semibold text-ink-900 sm:px-5 transition-colors hover:border-brand-400 hover:bg-ink-50"
                  >
                    View
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Health check history */}
      {healthChecks.length ? (
        <div className="mt-10">
          <HealthCheckHistory
            checks={healthChecks}
            accounts={accounts}
            hasPackage={isProtected}
            onProtected={() => setReloadKey((k) => k + 1)}
            limit={5}
          />
        </div>
      ) : null}

      {/* Need help? */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-ink-900">Need help?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {/* Messages */}
          <Link href="/portal/messages" className="group">
            <Card className="h-full p-5 transition-colors group-hover:border-brand-200">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 5h16v11H8l-4 4V5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="mt-3 text-sm font-semibold text-ink-900">Messages</p>
              <p className="mt-0.5 text-xs text-ink-500">Chat with our team here in your portal.</p>
              <p className="mt-3 text-xs font-semibold text-brand-700">Open messages →</p>
            </Card>
          </Link>

          {/* Emergency */}
          {isPaid ? (
            <button type="button" onClick={() => setEmergencyOpen(true)} className="group text-left">
              <Card className="h-full border-risk-high/30 bg-risk-high-bg/40 p-5 transition-colors group-hover:border-risk-high/60">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-risk-high text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3 2.5 20h19L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M12 10v4.5M12 17.2v.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <p className="mt-3 text-sm font-semibold text-ink-900">Emergency</p>
                <p className="mt-0.5 text-xs text-ink-600">Account hacked, suspended or disabled? Your package covers the recovery.</p>
                <p className="mt-3 text-xs font-semibold text-risk-high">Get help now →</p>
              </Card>
            </button>
          ) : (
            <a href={recoveryWhatsappUrl()} target="_blank" rel="noopener noreferrer" className="group">
              <Card className="h-full border-risk-high/30 bg-risk-high-bg/40 p-5 transition-colors group-hover:border-risk-high/60">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-risk-high text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3 2.5 20h19L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M12 10v4.5M12 17.2v.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <p className="mt-3 text-sm font-semibold text-ink-900">Emergency</p>
                <p className="mt-0.5 text-xs text-ink-600">
                  {inFreeMonth
                    ? "Locked out? Message us on WhatsApp. Free recovery starts after your first payment."
                    : "Locked out? Message us on WhatsApp and we'll handle your recovery."}
                </p>
                <p className="mt-3 text-xs font-semibold text-risk-high">Start recovery →</p>
              </Card>
            </a>
          )}

          {/* Contact support */}
          <Card className="h-full p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 13v-1a8 8 0 0 1 16 0v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <rect x="3" y="13" width="4.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
                <rect x="16.5" y="13" width="4.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
              </svg>
            </span>
            <p className="mt-3 text-sm font-semibold text-ink-900">Contact support</p>
            <div className="mt-2 space-y-1.5">
              {supportChannels.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  target={c.external ? "_blank" : undefined}
                  rel={c.external ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-ink-700 hover:bg-brand-50"
                >
                  <span className="text-brand-600">{c.icon}</span>
                  <span className="font-semibold">{c.label}</span>
                  <span className="truncate text-ink-400">{c.description}</span>
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Protection checklist — comes with a package */}
      {isProtected ? (
      <div id="checklist" className="mt-10 scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-ink-900">Your protection checklist</h2>
            <p className="mt-0.5 text-sm text-ink-500">Do these on every account you want protected, then mark each one as done. Every step raises your account health — all six takes it to {healthWithChecklist(0, CHECKLIST_TOTAL)}.</p>
          </div>
        </div>
        <Card className="mt-4 divide-y divide-ink-100 p-0">
          {CHECKLIST_DO.map((step, i) => {
            const done = checklistDone.has(step.ig);
            return (
            <div key={step.ig} className={`flex flex-col gap-3 px-5 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${done ? "bg-risk-low-bg/40" : ""}`}>
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white transition-colors ${done ? "bg-risk-low" : "bg-brand-600"}`}
                >
                  {done ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    <span aria-hidden="true">{step.icon}</span> {step.title}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">{step.how}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-center">
                {!done ? (
                  <a
                    href={`/go/instagram?step=${step.ig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-brand-200 px-3.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    Open Instagram app
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => toggleStep(step.ig)}
                  disabled={savingStep === step.ig}
                  aria-pressed={done}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                    done
                      ? "bg-risk-low text-white hover:bg-risk-low/90"
                      : "bg-brand-600 text-white hover:opacity-90"
                  }`}
                >
                  {done ? "Done ✓" : "Mark as done"}
                </button>
              </div>
            </div>
            );
          })}
        </Card>
        {checklistError ? <p className="mt-2 text-sm font-medium text-risk-high">{checklistError}</p> : null}
      </div>
      ) : null}

      {/* Recovery — handled on WhatsApp */}
      <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-green-800">Locked out of an account?</p>
          <p className="mt-0.5 text-sm text-ink-700">
            Recovery is handled on WhatsApp.{" "}
            {isPaid ? "Your package covers it for your registered accounts." : "With a paid package, there's no recovery fee."}
            {cases.length > 0 ? (
              <>
                {" "}
                <Link href="/portal/cases" className="font-semibold text-brand-700 underline">
                  View past cases ({cases.length})
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <a
          href={recoveryWhatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full bg-[#25D366] px-4 py-2 text-center text-sm font-bold text-white hover:bg-[#1fb957]"
        >
          Start recovery
        </a>
      </div>

      {emergencyOpen && <EmergencyModal onClose={() => setEmergencyOpen(false)} />}
    </div>
  );
}
