"use client";

import { useEffect, useState } from "react";
import { PaymentStatusBadge } from "@/components/portal/PaymentStatusBadge";
import type { PaymentRecord } from "@/lib/portal/payments";
import Link from "next/link";
import { formatNaira } from "@/lib/portal/case-fees";
import { DonutChart, DonutLegend } from "@/components/admin/DonutChart";
import { LineChart } from "@/components/admin/LineChart";
import { BrandLoader } from "@/components/BrandLoader";

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

type Dashboard = {
  needsAction?: NeedsAction;
  stats: Stats;
  requestsOverview: { date: string; count: number }[];
  platformBreakdown: { platform: string; count: number }[];
  statusBreakdown: { label: string; count: number }[];
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

const STATUS_COLORS = ["var(--color-accent-green)", "var(--color-accent-blue)", "var(--color-accent-orange)"];

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-semibold ${up ? "text-risk-low" : "text-risk-high"}`}>
      {up ? "↑" : "↓"} {Math.abs(pct)}%
    </span>
  );
}

function StatCard({
  icon,
  color,
  label,
  value,
  footer,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </span>
        <p className="text-sm font-medium text-ink-500">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold text-ink-900">{value}</p>
      {footer ? <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-400">{footer}</div> : null}
    </div>
  );
}

function StagePill({ stage }: { stage: string }) {
  const resolved = stage === "Resolved";
  const inProgress = ["Under Review", "Recovery Process", "Awaiting Platform Response"].includes(stage);
  const cls = resolved
    ? "bg-risk-low-bg text-risk-low"
    : inProgress
      ? "bg-brand-100 text-brand-700"
      : "bg-ink-100 text-ink-600";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{stage}</span>;
}

function IconDoc() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="white" strokeWidth="1.7" />
      <path d="M9 12h6M9 16h6" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="m5 13 4 4L19 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="white" strokeWidth="1.7" />
      <path d="M12 7.5V12l3 2" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconMoney() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="white" strokeWidth="1.7" />
      <path d="M12 7v10M9.5 9.3c0-1.1 1.1-2 2.5-2s2.5.7 2.5 1.8-1 1.6-2.5 1.9-2.5.8-2.5 1.9S10.6 15 12 15s2.5-.7 2.5-1.8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | "loading" | "unauthorized">("loading");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/dashboard");
      if (res.status === 403) {
        setData("unauthorized");
        return;
      }
      const json = await res.json();
      setData(json);
    }
    load();
  }, []);

  if (data === "unauthorized") {
    return <p className="text-sm text-ink-500">You don&apos;t have access to this page.</p>;
  }
  if (data === "loading") {
    return <BrandLoader label="Loading…" />;
  }

  const { stats, requestsOverview, platformBreakdown, statusBreakdown, agentsPerformance, recentRequests, recentTransactions } =
    data;

  const platformTotal = platformBreakdown.reduce((s, p) => s + p.count, 0);
  const platformSegments = platformBreakdown.map((p, i) => ({
    label: p.platform,
    value: p.count,
    color: PLATFORM_COLORS[i % PLATFORM_COLORS.length],
  }));
  const statusTotal = statusBreakdown.reduce((s, p) => s + p.count, 0);
  const statusSegments = statusBreakdown.map((s, i) => ({
    label: s.label,
    value: s.count,
    color: STATUS_COLORS[i % STATUS_COLORS.length],
  }));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-500">Here&apos;s what&apos;s happening with your recovery platform today.</p>
        </div>
      </div>

      {data.needsAction ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {[
            { label: "Payments to verify", value: data.needsAction.paymentsToVerify, href: "/admin/payments" },
            { label: "Balances overdue", value: data.needsAction.balancesOverdue, href: "/admin/payments" },
            { label: "Documents to review", value: data.needsAction.documentsToReview, href: "/admin/documents" },
            { label: "Unread client messages", value: data.needsAction.unreadClientMessages, href: "/admin/messages" },
            { label: "Cancellation requests", value: data.needsAction.cancellationRequests, href: "/admin/cases" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-2xl border p-4 shadow-sm transition-colors hover:bg-ink-50 ${
                item.value > 0 ? "border-brand-200 bg-brand-50/60" : "border-ink-100 bg-white"
              }`}
            >
              <p className="text-2xl font-semibold text-ink-900">{item.value}</p>
              <p className="mt-0.5 text-xs font-medium text-ink-500">{item.label}</p>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<IconDoc />}
          color="var(--color-accent-blue)"
          label="Total Requests"
          value={String(stats.totalRequests)}
          footer={
            <>
              <DeltaBadge pct={stats.totalRequestsDeltaPct} /> <span>vs last 7 days</span>
            </>
          }
        />
        <StatCard
          icon={<IconCheck />}
          color="var(--color-accent-green)"
          label="Recovered Accounts"
          value={String(stats.recovered)}
          footer={<span>{stats.totalRequests > 0 ? Math.round((stats.recovered / stats.totalRequests) * 100) : 0}% of total requests</span>}
        />
        <StatCard
          icon={<IconClock />}
          color="var(--color-brand-500)"
          label="In Progress"
          value={String(stats.inProgress)}
          footer={<span>{stats.totalRequests > 0 ? Math.round((stats.inProgress / stats.totalRequests) * 100) : 0}% of total requests</span>}
        />
        <StatCard
          icon={<IconMoney />}
          color="var(--color-accent-orange)"
          label="Total Revenue"
          value={formatNaira(stats.totalRevenueKobo)}
          footer={
            <>
              <DeltaBadge pct={stats.totalRevenueDeltaPct} /> <span>vs last 7 days</span>
            </>
          }
        />
      </div>

      {/* Requests overview + platform breakdown */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink-900">Requests Overview</h2>
          <p className="text-sm text-ink-400">Last 7 days</p>
          <div className="mt-4">
            <LineChart data={requestsOverview} />
          </div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink-900">Requests by Platform</h2>
          <div className="mt-4 flex flex-col items-center gap-6">
            <DonutChart segments={platformSegments} total={platformTotal} centerLabel="Total" />
            <div className="w-full">
              <DonutLegend segments={platformSegments} total={platformTotal} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent requests */}
      <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Recent Recovery Requests</h2>
          <Link href="/admin/cases" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            View all →
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="py-2 pr-4 font-medium">Client</th>
                <th className="py-2 pr-4 font-medium">Platform</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Payment</th>
                <th className="py-2 pr-4 font-medium">Agent</th>
                <th className="py-2 pr-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink-400">
                    No recovery requests yet.
                  </td>
                </tr>
              ) : (
                recentRequests.map((r) => (
                  <tr key={r.id} className="border-b border-ink-50 last:border-b-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-ink-900">{r.clientName || "Unknown"}</p>
                      <p className="text-xs text-ink-400">{r.clientEmail}</p>
                    </td>
                    <td className="py-3 pr-4 text-ink-600">
                      {r.platform} · {r.accountHandle}
                    </td>
                    <td className="py-3 pr-4">
                      <StagePill stage={r.stage} />
                    </td>
                    <td className="py-3 pr-4">
                      <PaymentStatusBadge payment={r.payment} />
                    </td>
                    <td className="py-3 pr-4 text-ink-600">{r.agentName || "—"}</td>
                    <td className="py-3 pr-4 text-ink-400">
                      {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status overview + agent performance */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink-900">Recovery Status Overview</h2>
          <div className="mt-4 flex flex-col items-center gap-6">
            <DonutChart segments={statusSegments} total={statusTotal} centerLabel="Total" />
            <div className="w-full">
              <DonutLegend segments={statusSegments} total={statusTotal} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">Agents Performance</h2>
            <Link href="/admin/agents" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              View all →
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="py-2 pr-4 font-medium">Agent</th>
                  <th className="py-2 pr-4 font-medium">Resolved</th>
                  <th className="py-2 pr-4 font-medium">In Progress</th>
                  <th className="py-2 pr-4 font-medium">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {agentsPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-ink-400">
                      No agents yet.
                    </td>
                  </tr>
                ) : (
                  agentsPerformance.map((a) => (
                    <tr key={a.id} className="border-b border-ink-50 last:border-b-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                            {a.name[0]?.toUpperCase()}
                          </span>
                          <span className="font-medium text-ink-900">{a.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-ink-600">{a.resolvedCount}</td>
                      <td className="py-3 pr-4 text-ink-600">{a.inProgressCount}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="w-9 text-xs font-semibold text-ink-700">{a.successRate}%</span>
                          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-100">
                            <span
                              className="block h-full rounded-full bg-accent-green"
                              style={{ width: `${a.successRate}%`, backgroundColor: "var(--color-accent-green)" }}
                            />
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-ink-900">Recent Transactions</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="py-2 pr-4 font-medium">From</th>
                <th className="py-2 pr-4 font-medium">Reference</th>
                <th className="py-2 pr-4 font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-ink-400">
                    No confirmed payments yet.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-ink-50 last:border-b-0">
                    <td className="py-3 pr-4 font-medium text-ink-900">{t.clientName}</td>
                    <td className="py-3 pr-4 text-ink-600">{t.label}</td>
                    <td className="py-3 pr-4 font-medium text-ink-900">{formatNaira(t.amountKobo)}</td>
                    <td className="py-3 pr-4 text-ink-400">
                      {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
