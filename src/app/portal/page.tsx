"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { EmergencyModal } from "@/components/portal/EmergencyModal";
import { supportChannels } from "@/components/portal/ContactSupportMenu";
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
import { recoveryWhatsappUrl } from "@/lib/site-config";
import { getPlan } from "@/lib/portal/billing";
import { CHECKLIST_DO } from "@/lib/protection-steps";

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


export default function PortalOverviewPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<PortalAccount[] | "loading">("loading");
  const [cases, setCases] = useState<PortalCase[] | "loading">("loading");
  const [subscription, setSubscription] = useState<ClientSubscription | null | "loading">("loading");
  const [userName, setUserName] = useState<string>("");
  const [emergencyOpen, setEmergencyOpen] = useState(false);

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

  // "active" = paid package; "trial" = free first month (protection on,
  // free recovery starts after the first payment).
  const isPaid = subscription?.status === "active";
  const inFreeMonth = subscription?.status === "trial";
  const isProtected = isPaid || inFreeMonth;
  const planShort = subscription ? getPlan(subscription.planId).name.replace(/^MetaShield\s+/, "") : "";
  const renewDate = subscription?.renewsOn
    ? new Date(subscription.renewsOn).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
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
        {isProtected ? (
          <Link href="/portal/billing">
            <span className="flex items-center gap-1.5 rounded-full bg-risk-low-bg px-3 py-1.5 text-xs font-semibold text-risk-low ring-1 ring-inset ring-risk-low/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risk-low opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-risk-low" />
              </span>
              {inFreeMonth ? `Free month · ${planShort}` : `Protected · ${planShort}`}
            </span>
          </Link>
        ) : (
          <Link href="/portal/billing">
            <span className="rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600">Not protected yet</span>
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {/* Package */}
        <Link href="/portal/billing" className="col-span-2 lg:col-span-1">
          <Card className={`h-full p-5 transition-colors hover:border-brand-200 ${isProtected ? "bg-risk-low-bg/30" : ""}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">My package</p>
            {isProtected ? (
              <>
                <p className="mt-2 text-2xl font-semibold text-risk-low">{planShort}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {inFreeMonth
                    ? `Free month${renewDate ? ` · ends ${renewDate}` : ""}`
                    : `Active${renewDate ? ` · renews ${renewDate}` : ""}`}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-2xl font-semibold text-ink-400">None yet</p>
                <p className="mt-1 text-xs font-medium text-brand-600">Start your free month →</p>
              </>
            )}
          </Card>
        </Link>
        {/* Health */}
        <Link href="/portal/accounts">
          <Card className="h-full p-5 transition-colors hover:border-brand-200">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Account health</p>
            {accounts.length > 0 ? (
              <>
                <p className={`mt-2 text-2xl font-semibold ${hc.text}`}>{averageHealth}<span className="text-sm font-normal text-ink-400">/100</span></p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                  <div className={`h-full rounded-full ${hc.bar} transition-all`} style={{ width: `${averageHealth}%` }} />
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-2xl font-semibold text-ink-300">—</p>
                <p className="mt-1 text-xs font-medium text-brand-600">Run a health check →</p>
              </>
            )}
          </Card>
        </Link>
        {/* Checklist */}
        <a href="#checklist">
          <Card className="h-full p-5 transition-colors hover:border-brand-200">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Protection checklist</p>
            <p className="mt-2 text-2xl font-semibold text-ink-900">{CHECKLIST_DO.length} steps</p>
            <p className="mt-1 text-xs font-medium text-brand-600">Do these to stay protected →</p>
          </Card>
        </a>
      </div>

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

      {/* Protection checklist */}
      <div id="checklist" className="mt-10 scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-ink-900">Your protection checklist</h2>
            <p className="mt-0.5 text-sm text-ink-500">Do these on every account you want protected. On your phone, each button opens the Instagram app.</p>
          </div>
        </div>
        <Card className="mt-4 divide-y divide-ink-100 p-0">
          {CHECKLIST_DO.map((step, i) => (
            <div key={step.ig} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    <span aria-hidden="true">{step.icon}</span> {step.title}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">{step.how}</p>
                </div>
              </div>
              <a
                href={`/go/instagram?step=${step.ig}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 self-start rounded-full border border-brand-200 px-3.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 sm:self-center"
              >
                Open Instagram app →
              </a>
            </div>
          ))}
        </Card>
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
