// Builds the agent dashboard from an agent's real assigned cases: what
// needs them now, what is waiting on the client, and how their pipeline
// looks. Pure functions (no database access) so the rules are testable.

import type { CaseStage } from "@/lib/portal/mock-data";
import { pickPaymentRecord, summarizePayment, type PaymentTone } from "@/lib/portal/payments";
import { nextAction, type CaseDocument } from "@/lib/portal/workflow";

export type Priority = "urgent" | "today" | "waiting" | "done";

export type AgentCaseInput = {
  row: Record<string, unknown> & {
    id: string;
    title: string;
    platform: string;
    account_handle: string | null;
    stage: CaseStage;
    created_at: string;
    cancelled_at?: string | null;
    cancellation_requested_at?: string | null;
    recovery_completed_at?: string | null;
  };
  clientName: string | null;
  clientEmail: string | null;
  docs: (CaseDocument & { created_at?: string })[];
  formSubmitted: boolean;
  unread: number;
  lastMessage: { body: string; from_role: string; created_at: string } | null;
  lastEventAt: string | null;
};

export type AgentCaseCard = {
  id: string;
  caseNo: string;
  title: string;
  platform: string;
  accountHandle: string | null;
  stage: CaseStage;
  clientName: string;
  clientEmail: string | null;
  paymentLabel: string;
  paymentTone: PaymentTone;
  nextStep: string;
  action: { label: string; priority: Priority; href: string };
  unread: number;
  docsToReview: number;
  lastActivityAt: string;
  idleDays: number;
  lastMessage: { preview: string; fromClient: boolean; at: string } | null;
  cancelled: boolean;
  createdAt: string;
};

export type AgentDashboard = {
  stats: {
    active: number;
    needsYou: number;
    unread: number;
    docsToReview: number;
    resolvedThisMonth: number;
    resolvedTotal: number;
  };
  queue: AgentCaseCard[];
  cases: AgentCaseCard[];
  pipeline: { stage: CaseStage; count: number }[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const IDLE_ALERT_DAYS = 3;
const PIPELINE: CaseStage[] = [
  "Payment Pending",
  "Documents Required",
  "Under Review",
  "Recovery Process",
  "Awaiting Platform Response",
  "Resolved",
];
const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, today: 1, waiting: 2, done: 3 };

export function caseNumber(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function latest(...isos: (string | null | undefined)[]): string {
  return isos.filter(Boolean).sort().at(-1) as string;
}

function chooseAction(c: {
  id: string;
  stage: CaseStage;
  cancelled: boolean;
  cancellationRequested: boolean;
  unread: number;
  docsToReview: number;
  idleDays: number;
  clientFirstName: string;
  depositConfirmed: boolean;
  depositStatus: string;
  balanceStatus: string;
  balanceOverdue: boolean;
  settled: boolean;
}): AgentCaseCard["action"] {
  const open = `/admin/cases/${c.id}`;
  const chat = `/admin/messages?case=${c.id}`;
  if (c.cancelled) return { label: "Cancelled", priority: "done", href: open };
  if (c.unread > 0)
    return {
      label: `Reply to ${c.clientFirstName} (${c.unread} new message${c.unread === 1 ? "" : "s"})`,
      priority: "urgent",
      href: chat,
    };
  if (c.cancellationRequested)
    return { label: "Cancellation requested — admin is deciding", priority: "waiting", href: open };
  if (c.docsToReview > 0)
    return {
      label: `Review ${c.docsToReview} document${c.docsToReview === 1 ? "" : "s"}`,
      priority: "urgent",
      href: open,
    };
  if (!c.depositConfirmed) {
    return c.depositStatus === "pending_review"
      ? { label: "Deposit is being verified by admin", priority: "waiting", href: open }
      : { label: "Waiting for the client's deposit", priority: "waiting", href: open };
  }
  switch (c.stage) {
    case "Documents Required":
      return { label: "Waiting for the client's form and documents", priority: "waiting", href: open };
    case "Under Review":
      return { label: "Approve or reject the documents", priority: "urgent", href: open };
    case "Recovery Process":
      return c.idleDays >= IDLE_ALERT_DAYS
        ? { label: `No update for ${c.idleDays} days — work the recovery`, priority: "urgent", href: open }
        : { label: "Work the recovery", priority: "today", href: open };
    case "Awaiting Platform Response":
      return c.idleDays >= IDLE_ALERT_DAYS
        ? { label: `No update for ${c.idleDays} days — follow up with the platform`, priority: "urgent", href: open }
        : { label: "Follow up with the platform", priority: "today", href: open };
    case "Resolved":
      if (c.settled) return { label: "Complete", priority: "done", href: open };
      if (c.balanceOverdue) return { label: "Balance overdue — remind the client", priority: "today", href: chat };
      if (c.balanceStatus === "pending_review")
        return { label: "Final balance is being verified by admin", priority: "waiting", href: open };
      return { label: "Waiting for the final balance", priority: "waiting", href: open };
    default:
      return { label: "Review the case", priority: "today", href: open };
  }
}

export function buildAgentCase(input: AgentCaseInput, now: Date = new Date()): AgentCaseCard {
  const { row } = input;
  const summary = summarizePayment(pickPaymentRecord(row as never), now);
  const cancelled = !!row.cancelled_at;
  const cancellationRequested = !!row.cancellation_requested_at && !cancelled;
  const docsToReview = input.docs.filter((d) => d.review_status === "submitted").length;
  const lastActivityAt = latest(row.created_at, input.lastEventAt, input.lastMessage?.created_at);
  const idleDays = Math.floor((now.getTime() - new Date(lastActivityAt).getTime()) / DAY_MS);
  const clientName = input.clientName || input.clientEmail || "Client";
  const action = chooseAction({
    id: row.id,
    stage: row.stage,
    cancelled,
    cancellationRequested,
    unread: input.unread,
    docsToReview,
    idleDays,
    clientFirstName: clientName.split(/[\s@]/)[0] || "the client",
    depositConfirmed: summary.depositConfirmed,
    depositStatus: summary.depositStatus,
    balanceStatus: summary.balanceStatus,
    balanceOverdue: summary.balanceOverdue,
    settled: summary.settled,
  });
  const next = nextAction({
    stage: row.stage,
    depositConfirmed: summary.depositConfirmed,
    depositStatus: summary.depositStatus,
    balanceStatus: summary.balanceStatus,
    cancelled,
    cancellationRequested,
    docs: input.docs,
    formSubmitted: input.formSubmitted,
  });
  return {
    id: row.id,
    caseNo: caseNumber(row.id),
    title: row.title,
    platform: row.platform,
    accountHandle: row.account_handle,
    stage: row.stage,
    clientName,
    clientEmail: input.clientEmail,
    paymentLabel: summary.label,
    paymentTone: summary.tone,
    nextStep: next.staff,
    action,
    unread: input.unread,
    docsToReview,
    lastActivityAt,
    idleDays,
    lastMessage: input.lastMessage
      ? {
          preview: input.lastMessage.body.length > 90 ? `${input.lastMessage.body.slice(0, 90)}…` : input.lastMessage.body,
          fromClient: input.lastMessage.from_role === "client",
          at: input.lastMessage.created_at,
        }
      : null,
    cancelled,
    createdAt: row.created_at,
  };
}

export function buildAgentDashboard(inputs: AgentCaseInput[], now: Date = new Date()): AgentDashboard {
  const cases = inputs.map((i) => buildAgentCase(i, now));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const live = cases.filter((c) => !c.cancelled);
  const queue = live
    .filter((c) => c.action.priority === "urgent" || c.action.priority === "today")
    .sort(
      (a, b) =>
        PRIORITY_ORDER[a.action.priority] - PRIORITY_ORDER[b.action.priority] ||
        a.lastActivityAt.localeCompare(b.lastActivityAt) // longest-waiting first
    );

  const resolvedThisMonth = inputs.filter((i) => {
    const done = i.row.recovery_completed_at;
    return i.row.stage === "Resolved" && !i.row.cancelled_at && !!done && new Date(done).getTime() >= monthStart;
  }).length;

  const counts = new Map<CaseStage, number>();
  for (const c of live) counts.set(c.stage, (counts.get(c.stage) ?? 0) + 1);
  const pipeline = [
    ...(["New Lead", "Assessment Pending"] as CaseStage[]).filter((s) => counts.get(s)),
    ...PIPELINE,
  ].map((stage) => ({ stage, count: counts.get(stage) ?? 0 }));

  cases.sort(
    (a, b) =>
      Number(a.cancelled) - Number(b.cancelled) ||
      PRIORITY_ORDER[a.action.priority] - PRIORITY_ORDER[b.action.priority] ||
      b.lastActivityAt.localeCompare(a.lastActivityAt)
  );

  return {
    stats: {
      active: live.filter((c) => c.stage !== "Resolved").length,
      needsYou: queue.length,
      unread: live.reduce((s, c) => s + c.unread, 0),
      docsToReview: live.reduce((s, c) => s + c.docsToReview, 0),
      resolvedThisMonth,
      resolvedTotal: live.filter((c) => c.stage === "Resolved").length,
    },
    queue,
    cases,
    pipeline,
  };
}
