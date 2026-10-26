"use client";

// Admin dashboard — same look as the agent dashboard (components/admin/
// DashboardParts.tsx): greeting + summary, number tiles, what needs the
// admin case by case, the stage pipeline, recent activity, then the
// platform figures (requests, platforms, agents, payments). Every number
// comes from /api/admin/dashboard (real rows, nothing invented).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PaymentStatusBadge } from "@/components/portal/PaymentStatusBadge";
import type { PaymentRecord } from "@/lib/portal/payments";
import type { CaseStage } from "@/lib/portal/mock-data";
import { formatNaira } from "@/lib/portal/case-fees";
import { DonutChart, DonutLegend } from "@/components/admin/DonutChart";
import { LineChart } from "@/components/admin/LineChart";
import { BrandLoader } from "@/components/BrandLoader";
import {
  ActivityFeed,
  AllCaughtUp,
  BannerButton,
  CountBadge,
  GreetingBanner,
  PipelineBars,
  PRIORITY_STYLE,
  STAGE_STYLE,
  StatTile,
  greeting,
  timeAgo,
  type ActivityItem,
} from "@/components/admin/DashboardParts";

type NeedsAction = {
  paymentsToVerify: number;
  balancesOverdue: number;
  documentsToReview: number;
  unreadClientMessages: number;
  cancellationRequests: number;
};

type Stats = {
  totalClients: number;
  totalRequests: number;
  totalRequestsDeltaPct: number | null;
  recovered: number;
  inProgress: number;
  totalRevenueKobo: number;
  totalRevenueDeltaPct: number | null;
};

type RecentRequest = {
  id: string;
  clientName: string | null;
  clientEmail: string | null;
  platform: string;
  accountHandle: string;
  stage: string;
  paymentStatus: "unpaid" | "pending_review" | "paid" | "failed";
  payment: PaymentRecord;
  agentName: string | null;
  createdAt: string;
};

type AgentPerformance = {
  id: string;
  name: string;
  active: boolean;
  resolvedCount: number;
  inProgressCount: number;
  totalCount: number;
  successRate: number;
};

type Transaction = {
  id: string;
  kind: "case" | "subscription";
  label: string;
  clientName: string;
  amountKobo: number;
  createdAt: string;
};

type AttentionItem = {
  id: string;
  priority: "urgent" | "today";
  kind: "payment" | "overdue" | "message" | "documents" | "cancellation" | "unassigned";
  label: string;
  caseId: string | null;
  caseNo: string | null;
  clientName: string;
  stage: CaseStage | null;
  href: string;
  at: string;
};

type Dashboard = {
  needsAction?: NeedsAction;
  attention?: { items: AttentionItem[]; total: number };
  pipeline?: { stage: CaseStage; count: number }[];
  activity?: ActivityItem[];
  stats: Stats;
  requestsOverview: { date: string; count: number }[];
  platformBreakdown: { platform: string; count: number }[];
  agentsPerformance: AgentPerformance[];
  recentRequests: RecentRequest[];
  recentTransactions: Transaction[];
};

const PLATFORM_COLORS = [
  "var(--color-brand-500)",
  "var(--color-accent-blue)",
  "var(--color-ink-900)",
  "var(--color-ink-300)",
  "var(--color-accent-orange)",
];

const ACTION_BUTTON: Record<AttentionItem["kind"], string> = {
  payment: "Verify",
  overdue: "Open",
  message: "Reply",
  documents: "Review",
  cancellation: "Decide",
  unassigned: "Assign",
};

function delta(pct: number | null) {
  if (pct === null) return undefined;
  return `${pct >= 0 ? "↑" : "↓"} ${Math.abs(pct)}% vs last 7 days`;
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const CARD = "min-w-0 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-6";

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | "loading" | "unauthorized" | "error">("loading");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (res.status === 403) {
        setData("unauthorized");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setNow(Date.now());
    } catch {
      setData((prev) => (prev === "loading" ? "error" : prev));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 60_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  if (data === "unauthorized") {
    return <p className="text-sm text-ink-500">You don&apos;t have access to this page.</p>;
  }
  if (data === "loading") return <BrandLoader size="page" label="Loading dashboard…" />;
  if (data === "error") {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-ink-900">Couldn&apos;t load the dashboard.</p>
        <button onClick={load} className="mt-3 text-sm font-semibold text-brand-700 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const { stats, requestsOverview, platformBreakdown, agentsPerformance, recentRequests, recentTransactions } = data;
  const n = data.needsAction;
  const attention = data.attention ?? { items: [], total: 0 };
  const platformTotal = platformBreakdown.reduce((s, p) => s + p.count, 0);
  const platformSegments = platformBreakdown.map((p, i) => ({
    label: p.platform,
    value: p.count,
    color: PLATFORM_COLORS[i % PLATFORM_COLORS.length],
  }));

  const summaryParts = [
    n?.paymentsToVerify ? `${n.paymentsToVerify} payment${n.paymentsToVerify === 1 ? "" : "s"} to verify` : null,
    n?.unreadClientMessages ? `${n.unreadClientMessages} unread message${n.unreadClientMessages === 1 ? "" : "s"}` : null,
    n?.documentsToReview ? `${n.documentsToReview} document${n.documentsToReview === 1 ? "" : "s"} to review` : null,
    n?.balancesOverdue ? `${n.balancesOverdue} overdue balance${n.balancesOverdue === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-5 sm:space-y-6">
      <GreetingBanner
        now={now}
        title={greeting(new Date(now))}
        summary={
          attention.total === 0
            ? "You're all caught up. Nothing needs you right now."
            : `${attention.total} thing${attention.total === 1 ? " needs" : "s need"} your attention${
                summaryParts.length ? ` · ${summaryParts.join(" · ")}` : ""
              }.`
        }
        actions={
          <>
            <BannerButton href="/admin/payments" primary>
              Verify payments <CountBadge n={n?.paymentsToVerify ?? 0} />
            </BannerButton>
            <BannerButton href="/admin/cases">Recovery requests</BannerButton>
          </>
        }
      />

      {/* Numbers */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Total requests" value={stats.totalRequests} tone="blue" icon="doc" hint={delta(stats.totalRequestsDeltaPct)} href="/admin/cases" />
        <StatTile
          label="In progress"
          value={stats.inProgress}
          tone="brand"
          icon="clock"
          hint={stats.totalRequests ? `${Math.round((stats.inProgress / stats.totalRequests) * 100)}% of requests` : undefined}
          href="/admin/cases"
        />
        <StatTile
          label="Recovered"
          value={stats.recovered}
          tone="green"
          icon="check"
          hint={stats.totalRequests ? `${Math.round((stats.recovered / stats.totalRequests) * 100)}% of requests` : undefined}
          href="/admin/cases"
        />
        <StatTile label="Revenue" value={formatNaira(stats.totalRevenueKobo)} tone="orange" icon="money" hint={delta(stats.totalRevenueDeltaPct)} href="/admin/payments" />
        <StatTile label="Clients" value={stats.totalClients} tone="ink" icon="users" href="/admin/clients" className="col-span-2 sm:col-span-1" />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr] xl:items-start">
        {/* Needs attention */}
        <section className={CARD}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">Needs your attention</h2>
            <span className="text-xs text-ink-400">Most urgent first</span>
          </div>
          {n ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(
                [
                  ["Payments", n.paymentsToVerify, "/admin/payments"],
                  ["Overdue", n.balancesOverdue, "/admin/payments"],
                  ["Documents", n.documentsToReview, "/admin/documents"],
                  ["Messages", n.unreadClientMessages, "/admin/messages"],
                  ["Cancellations", n.cancellationRequests, "/admin/cases"],
                ] as [string, number, string][]
              ).map(([label, count, href]) => (
                <Link
                  key={label}
                  href={href}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    count ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200" : "bg-ink-50 text-ink-400 ring-1 ring-ink-100"
                  }`}
                >
                  {label} {count}
                </Link>
              ))}
            </div>
          ) : null}
          {attention.items.length === 0 ? (
            <AllCaughtUp text="Payments to verify, client messages, documents and requests will show up here." />
          ) : (
            <ul className="mt-2 divide-y divide-ink-100">
              {attention.items.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-3.5">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_STYLE[a.priority].dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{a.label}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {a.caseNo ? `#${a.caseNo} · ` : ""}
                      {a.clientName}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {a.stage ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STAGE_STYLE[a.stage]}`}>{a.stage}</span>
                      ) : null}
                      <span className="text-[11px] text-ink-400">{timeAgo(a.at, now)}</span>
                    </div>
                  </div>
                  <Link
                    href={a.href}
                    className="shrink-0 rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    {ACTION_BUTTON[a.kind]}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {attention.total > attention.items.length ? (
            <p className="mt-2 text-xs text-ink-400">
              + {attention.total - attention.items.length} more — use the counts above to see them all.
            </p>
          ) : null}
        </section>

        <div className="min-w-0 space-y-6">
          <section className={CARD}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-900">Pipeline</h2>
              <Link href="/admin/cases" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                All requests →
              </Link>
            </div>
            {data.pipeline ? <PipelineBars pipeline={data.pipeline} /> : null}
          </section>
          <section className={CARD}>
            <h2 className="text-base font-semibold text-ink-900">Recent activity</h2>
            <ActivityFeed items={data.activity ?? []} now={now} empty="No case activity yet." />
          </section>
        </div>
      </div>

      {/* Requests + platforms */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr] [&>*]:min-w-0">
        <section className={CARD}>
          <h2 className="text-base font-semibold text-ink-900">Requests overview</h2>
          <p className="text-sm text-ink-400">Last 7 days</p>
          <div className="mt-4">
            <LineChart data={requestsOverview} />
          </div>
        </section>
        <section className={CARD}>
          <h2 className="text-base font-semibold text-ink-900">Requests by platform</h2>
          <div className="mt-4 flex flex-col items-center gap-6">
            <DonutChart segments={platformSegments} total={platformTotal} centerLabel="Total" />
            <div className="w-full">
              <DonutLegend segments={platformSegments} total={platformTotal} />
            </div>
          </div>
        </section>
      </div>

      {/* Recent requests */}
      <section className={CARD}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Recent recovery requests</h2>
          <Link href="/admin/cases" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            View all →
          </Link>
        </div>
        {recentRequests.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">No recovery requests yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-ink-100">
            {recentRequests.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/cases/${r.id}`}
                  className="-mx-2 flex flex-col gap-2 rounded-xl px-2 py-3 hover:bg-ink-50 md:flex-row md:items-center md:gap-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                      {(r.clientName || r.clientEmail || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">{r.clientName || r.clientEmail || "Unknown client"}</p>
                      <p className="truncate text-xs text-ink-500">
                        #{r.id.slice(0, 8).toUpperCase()} · {r.platform} · {r.accountHandle}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pl-12 md:pl-0">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        STAGE_STYLE[r.stage as CaseStage] ?? "bg-ink-100 text-ink-600"
                      }`}
                    >
                      {r.stage}
                    </span>
                    <PaymentStatusBadge payment={r.payment} />
                  </div>
                  <div className="flex items-center justify-between gap-3 pl-12 text-xs text-ink-400 md:w-44 md:justify-end md:pl-0">
                    <span className="truncate">{r.agentName || "Unassigned"}</span>
                    <span className="shrink-0">{shortDate(r.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        {/* Agents */}
        <section className={CARD}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">Agents</h2>
            <Link href="/admin/agent-dashboard" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              Agent view →
            </Link>
          </div>
          {agentsPerformance.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No agents yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-ink-100">
              {agentsPerformance.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/agent-dashboard?agent=${a.id}`} className="-mx-2 block rounded-xl px-2 py-3 hover:bg-ink-50">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                        {a.name[0]?.toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-900">
                          {a.name}
                          {!a.active ? <span className="ml-1.5 text-[11px] font-normal text-ink-400">(inactive)</span> : null}
                        </p>
                        <p className="text-xs text-ink-500">
                          {a.resolvedCount} resolved · {a.inProgressCount} in progress
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-ink-900">{a.successRate}%</span>
                    </div>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <span className="block h-full rounded-full bg-accent-green" style={{ width: `${a.successRate}%` }} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Payments */}
        <section className={CARD}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">Recent payments</h2>
            <Link href="/admin/payments" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              Payments →
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No confirmed payments yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-ink-100">
              {recentTransactions.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      t.kind === "subscription" ? "bg-accent-blue-bg text-accent-blue" : "bg-accent-green-bg text-accent-green"
                    }`}
                  >
                    ₦
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{t.clientName}</p>
                    <p className="truncate text-xs text-ink-500">
                      {t.label} · {shortDate(t.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-ink-900">{formatNaira(t.amountKobo)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
