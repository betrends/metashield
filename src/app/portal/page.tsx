"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { PaymentStatusBadge } from "@/components/portal/PaymentStatusBadge";
import {
  fetchAccounts,
  fetchCases,
  migratePendingLocalRecords,
  type PortalAccount,
  type PortalCase,
} from "@/lib/portal/data";
import { fetchSubscription, type ClientSubscription } from "@/lib/portal/subscriptions";
import { createClient } from "@/lib/supabase/client";
import { BrandLoader } from "@/components/BrandLoader";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function healthColor(score: number) {
  if (score >= 70) return { bar: "bg-risk-low", text: "text-risk-low" };
  if (score >= 40) return { bar: "bg-risk-medium", text: "text-risk-medium" };
  return { bar: "bg-risk-high", text: "text-risk-high" };
}

function PlatformBadge({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  const label = p.includes("instagram") ? "IG" : p.includes("facebook") ? "FB" : p.slice(0, 2).toUpperCase();
  const cls = p.includes("instagram")
    ? "bg-pink-50 text-pink-600"
    : p.includes("facebook")
    ? "bg-blue-50 text-blue-600"
    : "bg-ink-100 text-ink-500";
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

const stageColors: Record<string, string> = {
  "Payment Pending": "border-l-risk-medium",
  "In Progress": "border-l-brand-400",
  "Under Review": "border-l-brand-600",
  "Resolved": "border-l-risk-low",
  "Closed": "border-l-ink-300",
};

export default function PortalOverviewPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<PortalAccount[] | "loading">("loading");
  const [cases, setCases] = useState<PortalCase[] | "loading">("loading");
  const [subscription, setSubscription] = useState<ClientSubscription | null | "loading">("loading");
  const [userName, setUserName] = useState<string>("");

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
      const [accountsResult, casesResult, subscriptionResult] = await Promise.all([
        fetchAccounts(),
        fetchCases(),
        fetchSubscription(),
      ]);
      if (cancelled) return;
      setAccounts(accountsResult);
      setCases(casesResult);
      setSubscription(subscriptionResult);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (accounts === "loading" || cases === "loading" || subscription === "loading") {
    return <BrandLoader size="page" label="Loading your dashboard…" />;
  }

  const hasActiveSubscription = subscription?.status === "active";
  const openCases = cases.filter((c) => c.stage !== "Resolved").length;
  const averageHealth =
    accounts.length > 0
      ? Math.round(accounts.reduce((sum, a) => sum + a.health, 0) / accounts.length)
      : 0;
  const hc = healthColor(averageHealth);

  return (
    <div>
      {/* Greeting */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
            {greeting()}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold text-ink-900">
            {userName ? `${userName}'s Dashboard` : "Your Dashboard"}
          </h1>
        </div>
        {hasActiveSubscription && subscription && (
          <Link href="/portal/billing">
            <span className="flex items-center gap-1.5 rounded-full bg-risk-low-bg px-3 py-1.5 text-xs font-semibold text-risk-low ring-1 ring-inset ring-risk-low/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risk-low opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-risk-low" />
              </span>
              Protected · {subscription.planId.charAt(0).toUpperCase() + subscription.planId.slice(1).replace("_", " ")}
            </span>
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {/* Health */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Account Health</p>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-ink-300">
              <path d="M12 21C12 21 4 14.5 4 9a8 8 0 0 1 16 0c0 5.5-8 12-8 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </div>
          {accounts.length > 0 ? (
            <>
              <p className={`mt-2 text-2xl font-semibold ${hc.text}`}>{averageHealth}<span className="text-sm font-normal text-ink-400">/100</span></p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                <div className={`h-full rounded-full ${hc.bar} transition-all`} style={{ width: `${averageHealth}%` }} />
              </div>
            </>
          ) : (
            <p className="mt-2 text-2xl font-semibold text-ink-300">—</p>
          )}
        </Card>

        {/* Cases */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Open Cases</p>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-ink-300">
              <path d="M4 7a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
          </div>
          <p className={`mt-2 text-2xl font-semibold ${openCases > 0 ? "text-risk-medium" : "text-ink-900"}`}>
            {openCases}
          </p>
          <p className="mt-1 text-xs text-ink-400">{openCases === 1 ? "1 case in progress" : openCases > 1 ? `${openCases} cases in progress` : "All clear"}</p>
        </Card>

        {/* Protection */}
        <Link href="/portal/billing" className="col-span-2 lg:col-span-1">
          <Card className={`h-full p-5 transition-colors hover:border-brand-200 ${hasActiveSubscription ? "bg-risk-low-bg/30" : ""}`}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Protection</p>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={hasActiveSubscription ? "text-risk-low" : "text-ink-300"}>
                <path d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                {hasActiveSubscription && <path d="m8.5 12.2 2.4 2.4 4.6-4.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
              </svg>
            </div>
            {hasActiveSubscription ? (
              <>
                <p className="mt-2 text-2xl font-semibold text-risk-low">Active</p>
                <p className="mt-1 text-xs text-ink-400">
                  {subscription?.planId.charAt(0).toUpperCase() + (subscription?.planId.slice(1).replace("_", " ") ?? "")} plan
                  {subscription?.renewsOn ? ` · renews ${new Date(subscription.renewsOn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-2xl font-semibold text-ink-400">Inactive</p>
                <p className="mt-1 text-xs font-medium text-brand-600">Subscribe to protect your accounts →</p>
              </>
            )}
          </Card>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        <ButtonLink href="/portal/accounts/new" size="sm" variant="outline">
          + Run Health Check
        </ButtonLink>
        <ButtonLink href="/portal/cases/new" size="sm" variant="outline">
          + New Case
        </ButtonLink>
        {!hasActiveSubscription && (
          <ButtonLink href="/portal/billing" size="sm">
            Activate Protection
          </ButtonLink>
        )}
      </div>

      {/* Accounts */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">My Accounts</h2>
          {accounts.length > 0 && (
            <Link href="/portal/accounts" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
              View all
            </Link>
          )}
        </div>
        {accounts.length === 0 ? (
          <Card className="mt-4 flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-ink-400">
                <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
                <path d="M5 20c1-3.5 4-5 7-5s6 1.5 7 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm text-ink-500">No accounts added yet.</p>
            <ButtonLink href="/portal/accounts/new" size="sm">Run an Account Health Check</ButtonLink>
          </Card>
        ) : (
          <Card className="mt-4 overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Account</th>
                    <th className="px-5 py-3 font-medium">Health</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => {
                    const ac = healthColor(account.health);
                    return (
                      <tr
                        key={account.id}
                        onClick={() => router.push(`/portal/accounts/${account.id}`)}
                        className="cursor-pointer border-b border-ink-100 last:border-b-0 hover:bg-brand-50/40"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <PlatformBadge platform={account.platform} />
                            <span className="font-medium text-ink-800">{account.handle}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
                              <div className={`h-full rounded-full ${ac.bar}`} style={{ width: `${account.health}%` }} />
                            </div>
                            <span className={`text-xs font-semibold ${ac.text}`}>{account.health}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <RiskBadge level={account.level} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Cases */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Active Cases</h2>
          {cases.length > 0 && (
            <Link href="/portal/cases" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
              View all
            </Link>
          )}
        </div>
        {cases.length === 0 ? (
          <Card className="mt-4 flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-ink-400">
                <path d="M4 7a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm text-ink-500">No open cases right now.</p>
            <ButtonLink href="/portal/cases/new" size="sm" variant="outline">Check Recovery Eligibility</ButtonLink>
          </Card>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {cases.map((c) => (
              <Link key={c.id} href={`/portal/cases/${c.id}`}>
                <Card className={`border-l-4 transition-shadow hover:shadow-md ${stageColors[c.stage] ?? "border-l-ink-200"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-brand-700">
                      Case #{c.id.slice(0, 8).toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <PaymentStatusBadge payment={c.payment} />
                      <span className="rounded-full bg-risk-medium-bg px-2.5 py-1 text-xs font-semibold text-risk-medium">
                        {c.stage}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2.5 text-sm font-semibold text-ink-900">{c.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <PlatformBadge platform={c.platform} />
                    <span className="text-xs text-ink-400">{c.accountHandle}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
