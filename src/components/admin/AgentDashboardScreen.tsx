"use client";

// What the agent dashboard shows (data loading lives in
// app/admin/agent-dashboard/page.tsx). Kept separate so it can be
// previewed with sample data before release.

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AgentCaseCard, AgentDashboard } from "@/lib/portal/agent-dashboard";
import {
  ActivityFeed,
  AllCaughtUp,
  BannerButton,
  CountBadge,
  GreetingBanner,
  PipelineBars,
  PRIORITY_STYLE,
  PROGRESS,
  STAGE_BAR,
  STAGE_STYLE,
  StatTile as Stat,
  TONE,
  timeAgo,
  greeting,
  type ActivityItem as Activity,
} from "@/components/admin/DashboardParts";
export type AgentDashboardPayload =
  | { viewer: "admin"; agents: { id: string; name: string; active: boolean }[]; dashboard: null }
  | {
      viewer: "admin" | "agent";
      agent: { id: string; name: string };
      agents?: undefined;
      dashboard: AgentDashboard & { activity: Activity[] };
    };

type Filter = "all" | "needs" | "waiting" | "done";

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

      <GreetingBanner
        now={now}
        title={`${greeting(today)}, ${firstName}`}
        summary={
          d.stats.needsYou === 0
            ? "You're all caught up. Nothing needs you right now."
            : `${d.stats.needsYou} case${d.stats.needsYou === 1 ? " needs" : "s need"} you${
                d.stats.unread ? ` · ${d.stats.unread} unread message${d.stats.unread === 1 ? "" : "s"}` : ""
              }${d.stats.docsToReview ? ` · ${d.stats.docsToReview} document${d.stats.docsToReview === 1 ? "" : "s"} to review` : ""}.`
        }
        actions={
          <>
            <BannerButton href="/admin/messages" primary>
              Messages <CountBadge n={d.stats.unread} />
            </BannerButton>
            <BannerButton href="/admin/cases">All my cases</BannerButton>
          </>
        }
      />

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
            <AllCaughtUp text="New messages, documents and follow-ups will show up here." />
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
            <ActivityFeed items={d.activity} now={now} empty="No activity on your cases yet." />
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
