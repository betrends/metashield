"use client";

// What the agent dashboard shows (data loading lives in
// app/admin/agent-dashboard/page.tsx). Kept separate so it can be
// previewed with sample data before release.

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { AgentCaseCard, AgentDashboard, Priority } from "@/lib/portal/agent-dashboard";
import type { CaseStage } from "@/lib/portal/mock-data";

type Activity = { caseId: string; caseNo: string; caseTitle: string; event: string; at: string };
export type AgentDashboardPayload =
  | { viewer: "admin"; agents: { id: string; name: string; active: boolean }[]; dashboard: null }
  | {
      viewer: "admin" | "agent";
      agent: { id: string; name: string };
      agents?: undefined;
      dashboard: AgentDashboard & { activity: Activity[] };
    };

type Filter = "all" | "needs" | "waiting" | "done";

const STAGE_STYLE: Record<CaseStage, string> = {
  "New Lead": "bg-ink-100 text-ink-600",
  "Assessment Pending": "bg-ink-100 text-ink-600",
  "Payment Pending": "bg-accent-orange-bg text-accent-orange",
  "Documents Required": "bg-accent-blue-bg text-accent-blue",
  "Under Review": "bg-brand-100 text-brand-700",
  "Recovery Process": "bg-brand-600 text-white",
  "Awaiting Platform Response": "bg-risk-medium-bg text-risk-medium",
  Resolved: "bg-accent-green-bg text-accent-green",
};
const STAGE_BAR: Record<CaseStage, string> = {
  "New Lead": "bg-ink-300",
  "Assessment Pending": "bg-ink-300",
  "Payment Pending": "bg-accent-orange",
  "Documents Required": "bg-accent-blue",
  "Under Review": "bg-brand-400",
  "Recovery Process": "bg-brand-600",
  "Awaiting Platform Response": "bg-risk-medium",
  Resolved: "bg-accent-green",
};
const PROGRESS: CaseStage[] = [
  "Payment Pending",
  "Documents Required",
  "Under Review",
  "Recovery Process",
  "Awaiting Platform Response",
  "Resolved",
];
const TONE: Record<string, string> = {
  success: "bg-risk-low-bg text-risk-low",
  warning: "bg-risk-medium-bg text-risk-medium",
  danger: "bg-risk-high-bg text-risk-high",
  neutral: "bg-ink-100 text-ink-600",
};
const PRIORITY_STYLE: Record<Priority, { dot: string; label: string; chip: string }> = {
  urgent: { dot: "bg-risk-high", label: "Now", chip: "bg-risk-high-bg text-risk-high" },
  today: { dot: "bg-brand-500", label: "Today", chip: "bg-brand-50 text-brand-700" },
  waiting: { dot: "bg-ink-300", label: "Waiting", chip: "bg-ink-100 text-ink-500" },
  done: { dot: "bg-accent-green", label: "Done", chip: "bg-accent-green-bg text-accent-green" },
};

function timeAgo(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function greeting(date: Date) {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function AgentDashboardScreen({
  data,
  now,
  onSwitchAgent,
}: {
  data: AgentDashboardPayload;
  now: number;
  onSwitchAgent: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const dash = data.dashboard;
  const visible = useMemo(() => {
    if (!dash) return [];
    const q = query.trim().toLowerCase();
    return dash.cases.filter((c) => {
      const p = c.action.priority;
      if (filter === "needs" && !(p === "urgent" || p === "today")) return false;
      if (filter === "waiting" && p !== "waiting") return false;
      if (filter === "done" && p !== "done") return false;
      if (!q) return true;
      return [c.caseNo, c.title, c.clientName, c.clientEmail ?? "", c.platform, c.accountHandle ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [dash, filter, query]);

  // Admin without a chosen agent: pick whose dashboard to view.
  if (!data.dashboard) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Agent dashboards</h1>
        <p className="mt-1 text-sm text-ink-500">See exactly what each agent sees when they sign in.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.agents.length === 0 ? (
            <p className="text-sm text-ink-400">No agents yet — add one on the Agents page.</p>
          ) : (
            data.agents.map((a) => (
              <Link
                key={a.id}
                href={`/admin/agent-dashboard?agent=${a.id}`}
                className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm hover:border-brand-200 hover:bg-brand-50/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {a.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink-900">{a.name}</span>
                  <span className="text-xs text-ink-400">{a.active ? "Active" : "Inactive"} · Open dashboard →</span>
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    );
  }

  const d = data.dashboard;
  const firstName = data.agent.name.split(" ")[0];
  const today = new Date(now);
  const isAdminView = data.viewer === "admin";

  return (
    <div className="space-y-5 sm:space-y-6">
      {isAdminView ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-xs text-brand-800">
          <span>
            Admin view — you&apos;re seeing <strong>{data.agent.name}</strong>&apos;s dashboard exactly as they see it.
          </span>
          <button onClick={onSwitchAgent} className="font-semibold hover:underline">
            Switch agent
          </button>
        </div>
      ) : null}

      {/* Greeting */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-5 text-white shadow-lg sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-brand-400/30 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">
              {today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              {greeting(today)}, {firstName}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-brand-100">
              {d.stats.needsYou === 0
                ? "You're all caught up. Nothing needs you right now."
                : `${d.stats.needsYou} case${d.stats.needsYou === 1 ? " needs" : "s need"} you${
                    d.stats.unread ? ` · ${d.stats.unread} unread message${d.stats.unread === 1 ? "" : "s"}` : ""
                  }${d.stats.docsToReview ? ` · ${d.stats.docsToReview} document${d.stats.docsToReview === 1 ? "" : "s"} to review` : ""}.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/messages"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
            >
              Messages
              {d.stats.unread ? (
                <span className="rounded-full bg-risk-high px-1.5 py-0.5 text-[10px] font-bold text-white">{d.stats.unread}</span>
              ) : null}
            </Link>
            <Link
              href="/admin/cases"
              className="inline-flex items-center rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              All my cases
            </Link>
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Stat label="Active cases" value={d.stats.active} tone="brand" icon="folder" onClick={() => setFilter("all")} />
        <Stat label="Need you now" value={d.stats.needsYou} tone={d.stats.needsYou ? "red" : "green"} icon="bolt" onClick={() => setFilter("needs")} />
        <Stat label="Unread messages" value={d.stats.unread} tone={d.stats.unread ? "red" : "ink"} icon="chat" href="/admin/messages" />
        <Stat label="Documents to review" value={d.stats.docsToReview} tone={d.stats.docsToReview ? "orange" : "ink"} icon="doc" href="/admin/documents" />
        <Stat
          label="Resolved this month"
          value={d.stats.resolvedThisMonth}
          tone="green"
          icon="check"
          hint={`${d.stats.resolvedTotal} resolved in total`}
          onClick={() => setFilter("done")}
          className="col-span-2 sm:col-span-1"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr] xl:items-start">
        {/* To-do */}
        <section className="min-w-0 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">Your to-do</h2>
            <span className="text-xs text-ink-400">Most urgent first</span>
          </div>
          {d.queue.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-xl bg-accent-green-bg/50 px-4 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-green-bg text-accent-green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="m8.5 12.2 2.4 2.4 4.6-4.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="mt-3 text-sm font-semibold text-ink-900">All caught up</p>
              <p className="mt-1 text-xs text-ink-500">New messages, documents and follow-ups will show up here.</p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-ink-100">
              {d.queue.map((c) => (
                <li key={c.id} className="flex items-start gap-3 py-3.5">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_STYLE[c.action.priority].dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{c.action.label}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      #{c.caseNo} · {c.clientName} · {c.platform}
                      {c.accountHandle ? ` ${c.accountHandle}` : ""}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STAGE_STYLE[c.stage]}`}>{c.stage}</span>
                      <span className="text-[11px] text-ink-400">Last activity {timeAgo(c.lastActivityAt, now)}</span>
                    </div>
                  </div>
                  <Link
                    href={c.action.href}
                    className="shrink-0 rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    {c.action.href.startsWith("/admin/messages") ? "Reply" : "Open"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          {/* Pipeline */}
          <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-ink-900">Your pipeline</h2>
            <PipelineBars pipeline={d.pipeline} />
          </section>

          {/* Activity */}
          <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-ink-900">Recent activity</h2>
            {d.activity.length === 0 ? (
              <p className="mt-4 text-sm text-ink-400">No activity on your cases yet.</p>
            ) : (
              <ol className="mt-4 space-y-3.5 border-l border-ink-100 pl-4">
                {d.activity.map((a, i) => (
                  <li key={`${a.caseId}-${a.at}-${i}`} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand-400 ring-4 ring-brand-50" />
                    <p className="text-sm text-ink-800">{a.event}</p>
                    <p className="text-[11px] text-ink-400">
                      <Link href={`/admin/cases/${a.caseId}`} className="font-semibold text-brand-600 hover:underline">
                        #{a.caseNo}
                      </Link>{" "}
                      · {timeAgo(a.at, now)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      {/* Cases */}
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-ink-900">My cases</h2>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search case #, client, handle…"
            className="w-full rounded-full border border-ink-200 bg-white px-4 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:w-72"
          />
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {(
            [
              ["all", "All", d.cases.length],
              ["needs", "Need you", d.cases.filter((c) => c.action.priority === "urgent" || c.action.priority === "today").length],
              ["waiting", "Waiting on client", d.cases.filter((c) => c.action.priority === "waiting").length],
              ["done", "Done", d.cases.filter((c) => c.action.priority === "done").length],
            ] as [Filter, string, number][]
          ).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filter === key ? "bg-ink-900 text-white" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50"
              }`}
            >
              {label} <span className={filter === key ? "text-white/70" : "text-ink-400"}>{count}</span>
            </button>
          ))}
        </div>

        {d.cases.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
            <p className="text-sm font-semibold text-ink-900">No cases assigned yet</p>
            <p className="mt-1 text-xs text-ink-500">When the admin assigns you a case, it will appear here.</p>
          </div>
        ) : visible.length === 0 ? (
          <p className="mt-6 text-center text-sm text-ink-400">No cases match.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visible.map((c) => (
              <CaseCard key={c.id} c={c} now={now} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
  hint,
  href,
  onClick,
  className = "",
}: {
  label: string;
  value: number;
  tone: "brand" | "red" | "green" | "orange" | "ink";
  icon: "folder" | "bolt" | "chat" | "doc" | "check";
  hint?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    red: "bg-risk-high-bg text-risk-high",
    green: "bg-accent-green-bg text-accent-green",
    orange: "bg-accent-orange-bg text-accent-orange",
    ink: "bg-ink-100 text-ink-500",
  };
  const paths: Record<typeof icon, ReactNode> = {
    folder: <path d="M4 7a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
    bolt: <path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
    chat: <path d="M4 5h16v11H9l-5 4V5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
    doc: <path d="M8 3h6l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 10h6m-6 4h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
    check: <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  };
  const body = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          {paths[icon]}
        </svg>
      </span>
      <span className="min-w-0 sm:mt-3">
        <span className="block text-xl font-semibold leading-tight text-ink-900 sm:text-2xl">{value}</span>
        <span className="block text-xs font-medium leading-tight text-ink-500">{label}</span>
        {hint ? <span className="mt-0.5 block text-[11px] text-ink-400">{hint}</span> : null}
      </span>
    </>
  );
  // Phones: icon beside the number (short tiles). Larger screens: stacked.
  const cls = `flex h-full items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:flex-col sm:items-start sm:gap-0 sm:p-4 ${className}`;
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

function PipelineBars({ pipeline }: { pipeline: { stage: CaseStage; count: number }[] }) {
  const max = Math.max(1, ...pipeline.map((p) => p.count));
  return (
    <ul className="mt-4 space-y-3">
      {pipeline.map((p) => (
        <li key={p.stage}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink-700">{p.stage}</span>
            <span className="font-semibold text-ink-900">{p.count}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100">
            <div
              className={`h-full rounded-full ${STAGE_BAR[p.stage]} transition-all duration-500`}
              style={{ width: `${p.count ? Math.max(6, (p.count / max) * 100) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function CaseCard({ c, now }: { c: AgentCaseCard; now: number }) {
  const step = PROGRESS.indexOf(c.stage);
  return (
    <article
      className={`flex min-w-0 flex-col rounded-2xl border bg-white p-5 shadow-sm ${
        c.action.priority === "urgent" ? "border-risk-high/30" : "border-ink-100"
      } ${c.cancelled ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-brand-600">Case #{c.caseNo}</p>
          <Link href={`/admin/cases/${c.id}`} className="mt-0.5 block truncate text-sm font-semibold text-ink-900 hover:text-brand-700">
            {c.title}
          </Link>
          <p className="mt-0.5 truncate text-xs text-ink-500">
            {c.clientName} · {c.platform}
            {c.accountHandle ? ` ${c.accountHandle}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLE[c.action.priority].chip}`}>
            {c.cancelled ? "Cancelled" : PRIORITY_STYLE[c.action.priority].label}
          </span>
          {c.unread ? (
            <span className="rounded-full bg-risk-high px-2 py-0.5 text-[10px] font-bold text-white">{c.unread} new</span>
          ) : null}
        </div>
      </div>

      {/* Stage progress */}
      <div className="mt-4">
        <div className="flex gap-1">
          {PROGRESS.map((s, i) => (
            <span
              key={s}
              title={s}
              className={`h-1.5 flex-1 rounded-full ${step >= 0 && i <= step ? STAGE_BAR[c.stage] : "bg-ink-100"}`}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STAGE_STYLE[c.stage]}`}>{c.stage}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE[c.paymentTone] ?? TONE.neutral}`}>
            {c.paymentLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-ink-50 px-3.5 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Next step</p>
        <p className="mt-0.5 text-sm font-medium text-ink-800">{c.action.label}</p>
      </div>

      {c.lastMessage ? (
        <p className="mt-3 line-clamp-2 text-xs text-ink-500">
          <span className="font-semibold text-ink-700">{c.lastMessage.fromClient ? c.clientName.split(" ")[0] : "Team"}:</span>{" "}
          {c.lastMessage.preview} <span className="text-ink-400">· {timeAgo(c.lastMessage.at, now)}</span>
        </p>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="text-[11px] text-ink-400">Updated {timeAgo(c.lastActivityAt, now)}</span>
        <div className="flex gap-2">
          <Link
            href={`/admin/messages?case=${c.id}`}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
          >
            Message
          </Link>
          <Link href={`/admin/cases/${c.id}`} className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
            Open case
          </Link>
        </div>
      </div>
    </article>
  );
}
