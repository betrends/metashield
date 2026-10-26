"use client";

// Building blocks shared by the admin and agent dashboards, so both look
// and behave the same: greeting banner, number tiles, stage pipeline,
// activity feed, and the stage/priority colours.

import type { ReactNode } from "react";
import Link from "next/link";
import type { Priority } from "@/lib/portal/agent-dashboard";
import type { CaseStage } from "@/lib/portal/mock-data";

export type ActivityItem = { caseId: string; caseNo: string; caseTitle: string; event: string; at: string };

export const STAGE_STYLE: Record<CaseStage, string> = {
  "New Lead": "bg-ink-100 text-ink-600",
  "Assessment Pending": "bg-ink-100 text-ink-600",
  "Payment Pending": "bg-accent-orange-bg text-accent-orange",
  "Documents Required": "bg-accent-blue-bg text-accent-blue",
  "Under Review": "bg-brand-100 text-brand-700",
  "Recovery Process": "bg-brand-600 text-white",
  "Awaiting Platform Response": "bg-risk-medium-bg text-risk-medium",
  Resolved: "bg-accent-green-bg text-accent-green",
};
export const STAGE_BAR: Record<CaseStage, string> = {
  "New Lead": "bg-ink-300",
  "Assessment Pending": "bg-ink-300",
  "Payment Pending": "bg-accent-orange",
  "Documents Required": "bg-accent-blue",
  "Under Review": "bg-brand-400",
  "Recovery Process": "bg-brand-600",
  "Awaiting Platform Response": "bg-risk-medium",
  Resolved: "bg-accent-green",
};
export const PROGRESS: CaseStage[] = [
  "Payment Pending",
  "Documents Required",
  "Under Review",
  "Recovery Process",
  "Awaiting Platform Response",
  "Resolved",
];
export const TONE: Record<string, string> = {
  success: "bg-risk-low-bg text-risk-low",
  warning: "bg-risk-medium-bg text-risk-medium",
  danger: "bg-risk-high-bg text-risk-high",
  neutral: "bg-ink-100 text-ink-600",
};
export const PRIORITY_STYLE: Record<Priority, { dot: string; label: string; chip: string }> = {
  urgent: { dot: "bg-risk-high", label: "Now", chip: "bg-risk-high-bg text-risk-high" },
  today: { dot: "bg-brand-500", label: "Today", chip: "bg-brand-50 text-brand-700" },
  waiting: { dot: "bg-ink-300", label: "Waiting", chip: "bg-ink-100 text-ink-500" },
  done: { dot: "bg-accent-green", label: "Done", chip: "bg-accent-green-bg text-accent-green" },
};

export function timeAgo(iso: string, now: number) {
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

export function greeting(date: Date) {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function StatTile({
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
  value: number | string;
  tone: "brand" | "red" | "green" | "orange" | "ink" | "blue";
  icon: "folder" | "bolt" | "chat" | "doc" | "check" | "money" | "users" | "clock";
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
    blue: "bg-accent-blue-bg text-accent-blue",
  };
  const paths: Record<typeof icon, ReactNode> = {
    folder: <path d="M4 7a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
    bolt: <path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
    chat: <path d="M4 5h16v11H9l-5 4V5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
    doc: <path d="M8 3h6l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 10h6m-6 4h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
    check: <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    money: <path d="M3 7h18v10H3V7Zm9 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 10v4m12-4v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
    users: <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 9c.8-3.2 3.3-5 6-5s5.2 1.8 6 5m1-14.5a3 3 0 0 1 0 5.8M17 15c2.3.4 4 1.9 4.5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
    clock: <path d="M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
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

export function PipelineBars({ pipeline }: { pipeline: { stage: CaseStage; count: number }[] }) {
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

export function GreetingBanner({
  now,
  title,
  summary,
  actions,
}: {
  now: number;
  title: string;
  summary: string;
  actions?: ReactNode;
}) {
  const today = new Date(now);
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-5 text-white shadow-lg sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-brand-400/30 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">
            {today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-xl text-sm text-brand-100">{summary}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function BannerButton({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
          : "inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
      }
    >
      {children}
    </Link>
  );
}

export function CountBadge({ n }: { n: number }) {
  return n ? <span className="rounded-full bg-risk-high px-1.5 py-0.5 text-[10px] font-bold text-white">{n}</span> : null;
}

export function ActivityFeed({ items, now, empty }: { items: ActivityItem[]; now: number; empty: string }) {
  if (items.length === 0) return <p className="mt-4 text-sm text-ink-400">{empty}</p>;
  return (
    <ol className="mt-4 space-y-3.5 border-l border-ink-100 pl-4">
      {items.map((a, i) => (
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
  );
}

export function AllCaughtUp({ text }: { text: string }) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-xl bg-accent-green-bg/50 px-4 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-green-bg text-accent-green">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="m8.5 12.2 2.4 2.4 4.6-4.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="mt-3 text-sm font-semibold text-ink-900">All caught up</p>
      <p className="mt-1 text-xs text-ink-500">{text}</p>
    </div>
  );
}
