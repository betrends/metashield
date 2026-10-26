// One aggregated payload for the admin Dashboard — stats, the requests
// trend, platform/status breakdowns, agent performance, and recent
// activity — all derived from real rows so nothing here is invented.
// Gated to ADMIN_EMAIL.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";
import { caseStages, type CaseStage } from "@/lib/portal/mock-data";
import { formatNaira } from "@/lib/portal/case-fees";
import { PAYMENT_COLUMNS, pickPaymentRecord, summarizePayment } from "@/lib/portal/payments";

const IN_PROGRESS_STAGES: CaseStage[] = ["Under Review", "Recovery Process", "Awaiting Platform Response"];
const DAY_MS = 24 * 60 * 60 * 1000;
// Confirmations recorded before deposit/balance tracking existed only
// left this timeline event (and no deposit_paid_at).
const LEGACY_PAYMENT_CONFIRMED_EVENT = "Payment confirmed — recovery started";

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

type CaseRow = {
  id: string;
  user_id: string;
  title: string;
  platform: string;
  account_handle: string;
  stage: CaseStage;
  payment_status: "unpaid" | "pending_review" | "paid" | "failed";
  fee_amount_kobo: number | null;
  deposit_paid_at: string | null;
  balance_paid_at: string | null;
  agent_id: string | null;
  agent_name: string | null;
  created_at: string;
  cancelled_at: string | null;
  cancellation_requested_at: string | null;
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

const caseNo = (id: string) => id.slice(0, 8).toUpperCase();

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!user || !adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const admin = createAdminClient();

  const [{ count: totalClients }, { data: casesData }, { data: agentsData }, { data: invoicesData }, { data: confirmEvents }] =
    await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin
        .from("cases")
        .select(
          `id, user_id, title, platform, account_handle, stage, agent_id, agent_name, created_at, cancelled_at, cancellation_requested_at, ${PAYMENT_COLUMNS}`
        )
        .order("created_at", { ascending: false }),
      admin.from("agents").select("id, name, email, phone, active").order("created_at", { ascending: true }),
      admin
        .from("invoices")
        .select("id, user_id, amount_kobo, created_at")
        .eq("status", "paid")
        .not("subscription_id", "is", null)
        .order("created_at", { ascending: false }),
      admin
        .from("case_timeline_events")
        .select("case_id, created_at")
        .eq("event", LEGACY_PAYMENT_CONFIRMED_EVENT)
        .order("created_at", { ascending: false }),
    ]);

  const cases = (casesData ?? []) as CaseRow[];
  const agents = agentsData ?? [];
  const invoices = invoicesData ?? [];
  const casesById = new Map(cases.map((c) => [c.id, c]));
  const legacyConfirmedAt = new Map<string, string>();
  for (const e of confirmEvents ?? []) {
    if (!legacyConfirmedAt.has(e.case_id)) legacyConfirmedAt.set(e.case_id, e.created_at);
  }

  // Every verified installment, with the amount actually received and when
  // it was confirmed — the basis for revenue figures (a deposit is 50% of
  // the fee, so summing whole fees would overstate revenue).
  const confirmations: { case_id: string; created_at: string; amountKobo: number; kind: "deposit" | "balance" }[] = [];
  for (const c of cases) {
    const p = summarizePayment(pickPaymentRecord(c as unknown as Record<string, unknown>));
    const depositAt = c.deposit_paid_at ?? legacyConfirmedAt.get(c.id) ?? null;
    if (p.depositConfirmed && depositAt) {
      confirmations.push({ case_id: c.id, created_at: depositAt, amountKobo: p.depositKobo, kind: "deposit" });
    }
    if (p.balanceStatus === "paid" && c.balance_paid_at) {
      confirmations.push({ case_id: c.id, created_at: c.balance_paid_at, amountKobo: p.balanceKobo, kind: "balance" });
    }
  }

  const now = Date.now();
  const weekStart = now - 7 * DAY_MS;
  const prevWeekStart = now - 14 * DAY_MS;

  // ── Stats ────────────────────────────────────────────────────────────
  const totalRequests = cases.length;
  const requestsThisWeek = cases.filter((c) => new Date(c.created_at).getTime() >= weekStart).length;
  const requestsPrevWeek = cases.filter((c) => {
    const t = new Date(c.created_at).getTime();
    return t >= prevWeekStart && t < weekStart;
  }).length;

  const recovered = cases.filter((c) => c.stage === "Resolved").length;
  const inProgress = cases.filter((c) => IN_PROGRESS_STAGES.includes(c.stage)).length;

  const caseRevenueKobo = cases.reduce(
    (sum, c) => sum + summarizePayment(pickPaymentRecord(c as unknown as Record<string, unknown>)).amountPaidKobo,
    0
  );
  const subscriptionRevenueKobo = invoices.reduce((sum, inv) => sum + (inv.amount_kobo ?? 0), 0);
  const totalRevenueKobo = caseRevenueKobo + subscriptionRevenueKobo;

  const revenueThisWeekKobo =
    confirmations
      .filter((e) => new Date(e.created_at).getTime() >= weekStart)
      .reduce((sum, e) => sum + e.amountKobo, 0) +
    invoices
      .filter((i) => new Date(i.created_at).getTime() >= weekStart)
      .reduce((sum, i) => sum + (i.amount_kobo ?? 0), 0);
  const revenuePrevWeekKobo =
    confirmations
      .filter((e) => {
        const t = new Date(e.created_at).getTime();
        return t >= prevWeekStart && t < weekStart;
      })
      .reduce((sum, e) => sum + e.amountKobo, 0) +
    invoices
      .filter((i) => {
        const t = new Date(i.created_at).getTime();
        return t >= prevWeekStart && t < weekStart;
      })
      .reduce((sum, i) => sum + (i.amount_kobo ?? 0), 0);

  // ── Requests overview (last 7 days) ─────────────────────────────────
  const requestsOverview: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    requestsOverview.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: cases.filter((c) => dayKey(c.created_at) === key).length,
    });
  }

  // ── Platform breakdown ───────────────────────────────────────────────
  const platformCounts = new Map<string, number>();
  for (const c of cases) {
    platformCounts.set(c.platform, (platformCounts.get(c.platform) ?? 0) + 1);
  }
  const platformBreakdown = Array.from(platformCounts.entries())
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);

  // ── Status breakdown ─────────────────────────────────────────────────
  const gettingStarted = totalRequests - recovered - inProgress;
  const statusBreakdown = [
    { label: "Recovered", count: recovered },
    { label: "In Progress", count: inProgress },
    { label: "Getting Started", count: Math.max(gettingStarted, 0) },
  ];

  // ── Agent performance ────────────────────────────────────────────────
  const agentsPerformance = agents
    .map((agent) => {
      const assigned = cases.filter((c) => c.agent_id === agent.id);
      const resolvedCount = assigned.filter((c) => c.stage === "Resolved").length;
      return {
        id: agent.id,
        name: agent.name,
        active: agent.active,
        resolvedCount,
        inProgressCount: assigned.length - resolvedCount,
        totalCount: assigned.length,
        successRate: assigned.length > 0 ? Math.round((resolvedCount / assigned.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.resolvedCount - a.resolvedCount);

  // ── Recent requests (latest 5) ───────────────────────────────────────
  const recentCases = cases.slice(0, 5);
  const recentRequests = await Promise.all(
    recentCases.map(async (c) => {
      const { data: userData } = await admin.auth.admin.getUserById(c.user_id);
      return {
        id: c.id,
        clientName: (userData?.user?.user_metadata?.full_name as string | undefined) || null,
        clientEmail: userData?.user?.email || null,
        platform: c.platform,
        accountHandle: c.account_handle,
        stage: c.stage,
        paymentStatus: c.payment_status,
        payment: pickPaymentRecord(c as unknown as Record<string, unknown>),
        agentName: c.agent_name,
        createdAt: c.created_at,
      };
    })
  );

  // ── Recent transactions (case payments + subscription invoices) ─────
  const caseTransactions = confirmations.map((e) => {
    const c = casesById.get(e.case_id);
    return {
      id: `case-${e.case_id}-${e.kind}`,
      kind: "case" as const,
      label: `${c?.title ?? "Recovery case"} — ${e.kind === "deposit" ? "deposit" : "final balance"}`,
      userId: c?.user_id ?? null,
      amountKobo: e.amountKobo,
      createdAt: e.created_at,
    };
  });
  const invoiceTransactions = invoices.map((i) => ({
    id: `invoice-${i.id}`,
    kind: "subscription" as const,
    label: "Account Protection subscription",
    userId: i.user_id as string | null,
    amountKobo: i.amount_kobo ?? 0,
    createdAt: i.created_at,
  }));
  const recentTransactionsRaw = [...caseTransactions, ...invoiceTransactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const recentTransactions = await Promise.all(
    recentTransactionsRaw.map(async (t) => {
      const clientName = t.userId
        ? (await admin.auth.admin.getUserById(t.userId)).data?.user?.user_metadata?.full_name
        : null;
      return {
        id: t.id,
        kind: t.kind,
        label: t.label,
        clientName: (clientName as string | undefined) || "A client",
        amountKobo: t.amountKobo,
        createdAt: t.createdAt,
      };
    })
  );

  // ── Needs action (live counts) ───────────────────────────────────────
  const [pendingDocs, unreadMsgs, cancelRequests] = await Promise.all([
    admin.from("documents").select("id", { count: "exact", head: true }).eq("review_status", "submitted").not("case_id", "is", null),
    admin.from("messages").select("id", { count: "exact", head: true }).eq("from_role", "client").is("read_at", null),
    admin
      .from("cases")
      .select("id", { count: "exact", head: true })
      .not("cancellation_requested_at", "is", null)
      .is("cancelled_at", null),
  ]);
  const needsAction = {
    paymentsToVerify: cases.filter((c) => {
      const p = pickPaymentRecord(c as unknown as Record<string, unknown>);
      return p.payment_status === "pending_review" || p.balance_status === "pending_review";
    }).length,
    balancesOverdue: cases.filter((c) => summarizePayment(pickPaymentRecord(c as unknown as Record<string, unknown>)).balanceOverdue).length,
    documentsToReview: pendingDocs.count ?? 0,
    unreadClientMessages: unreadMsgs.count ?? 0,
    cancellationRequests: cancelRequests.count ?? 0,
  };

  // ── What needs the admin, case by case (most urgent first) ──────────
  const [docRows, msgRows, eventRows] = await Promise.all([
    admin
      .from("documents")
      .select("case_id, created_at")
      .eq("review_status", "submitted")
      .not("case_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(500),
    admin
      .from("messages")
      .select("case_id, user_id, created_at")
      .eq("from_role", "client")
      .is("read_at", null)
      .order("created_at", { ascending: true })
      .limit(500),
    admin.from("case_timeline_events").select("case_id, event, created_at").order("created_at", { ascending: false }).limit(12),
  ]);

  const nameIds = new Set<string>();
  const attention: (Omit<AttentionItem, "clientName"> & { userId: string })[] = [];
  const live = cases.filter((c) => !c.cancelled_at);
  for (const c of live) {
    const p = summarizePayment(pickPaymentRecord(c as unknown as Record<string, unknown>));
    const base = { caseId: c.id, caseNo: caseNo(c.id), stage: c.stage, userId: c.user_id };
    if (p.depositStatus === "pending_review")
      attention.push({ ...base, id: `dep-${c.id}`, priority: "urgent", kind: "payment", label: `Verify ${formatNaira(p.depositKobo)} deposit receipt`, href: "/admin/payments", at: c.created_at });
    if (p.balanceStatus === "pending_review")
      attention.push({ ...base, id: `bal-${c.id}`, priority: "urgent", kind: "payment", label: `Verify ${formatNaira(p.balanceKobo)} final balance receipt`, href: "/admin/payments", at: p.completedAt ?? c.created_at });
    if (p.balanceOverdue)
      attention.push({ ...base, id: `due-${c.id}`, priority: "urgent", kind: "overdue", label: `Balance of ${formatNaira(p.balanceKobo)} is overdue — chase the client`, href: `/admin/cases/${c.id}`, at: p.balanceDueAt ?? c.created_at });
    if (c.cancellation_requested_at)
      attention.push({ ...base, id: `can-${c.id}`, priority: "today", kind: "cancellation", label: "Decide on the client's cancellation request", href: `/admin/cases/${c.id}`, at: c.cancellation_requested_at });
    if (!c.agent_id && c.stage !== "Resolved" && p.depositStatus !== "unpaid")
      attention.push({ ...base, id: `asg-${c.id}`, priority: "today", kind: "unassigned", label: "Assign an agent", href: "/admin/cases", at: c.created_at });
  }
  const docsByCase = new Map<string, { n: number; at: string }>();
  for (const d of docRows.data ?? []) {
    const cur = docsByCase.get(d.case_id as string);
    docsByCase.set(d.case_id as string, { n: (cur?.n ?? 0) + 1, at: cur?.at ?? (d.created_at as string) });
  }
  for (const [id, { n, at }] of docsByCase) {
    const c = casesById.get(id);
    if (!c || c.cancelled_at) continue;
    attention.push({ id: `doc-${id}`, priority: "today", kind: "documents", label: `Review ${n} document${n === 1 ? "" : "s"}`, caseId: id, caseNo: caseNo(id), stage: c.stage, userId: c.user_id, href: `/admin/cases/${id}`, at });
  }
  const msgsByThread = new Map<string, { n: number; at: string; caseId: string | null; userId: string }>();
  for (const m of msgRows.data ?? []) {
    const key = (m.case_id as string | null) ?? `user:${m.user_id}`;
    const cur = msgsByThread.get(key);
    msgsByThread.set(key, { n: (cur?.n ?? 0) + 1, at: cur?.at ?? (m.created_at as string), caseId: (m.case_id as string | null) ?? null, userId: m.user_id as string });
  }
  for (const [key, t] of msgsByThread) {
    const c = t.caseId ? casesById.get(t.caseId) : undefined;
    attention.push({
      id: `msg-${key}`,
      priority: "urgent",
      kind: "message",
      label: `${t.n} unread message${t.n === 1 ? "" : "s"} — reply`,
      caseId: t.caseId,
      caseNo: t.caseId ? caseNo(t.caseId) : null,
      stage: c?.stage ?? null,
      userId: t.userId,
      href: t.caseId ? `/admin/messages?case=${t.caseId}` : "/admin/messages",
      at: t.at,
    });
  }
  attention.sort((a, b) => (a.priority === b.priority ? a.at.localeCompare(b.at) : a.priority === "urgent" ? -1 : 1));
  const topAttention = attention.slice(0, 12);
  for (const a of topAttention) nameIds.add(a.userId);
  const { data: nameRows } = nameIds.size
    ? await admin.from("profiles").select("id, full_name, email").in("id", Array.from(nameIds))
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const names = new Map((nameRows ?? []).map((r) => [r.id as string, (r.full_name as string | null) || (r.email as string | null) || "A client"]));
  const attentionItems: AttentionItem[] = topAttention.map(({ userId, ...a }) => ({ ...a, clientName: names.get(userId) ?? "A client" }));

  // ── Cases per stage (cancelled cases left out) ───────────────────────
  const stageCounts = new Map<CaseStage, number>();
  for (const c of live) stageCounts.set(c.stage, (stageCounts.get(c.stage) ?? 0) + 1);
  const pipeline = caseStages
    .filter((st) => (st !== "New Lead" && st !== "Assessment Pending") || stageCounts.get(st))
    .map((stage) => ({ stage, count: stageCounts.get(stage) ?? 0 }));

  const activity = (eventRows.data ?? []).map((e) => ({
    caseId: e.case_id as string,
    caseNo: caseNo(e.case_id as string),
    caseTitle: casesById.get(e.case_id as string)?.title ?? "",
    event: e.event as string,
    at: e.created_at as string,
  }));

  return NextResponse.json({
    attention: { items: attentionItems, total: attention.length },
    pipeline,
    activity,
    needsAction,
    stats: {
      totalClients: totalClients ?? 0,
      totalRequests,
      totalRequestsDeltaPct: pctDelta(requestsThisWeek, requestsPrevWeek),
      recovered,
      inProgress,
      totalRevenueKobo,
      totalRevenueDeltaPct: pctDelta(revenueThisWeekKobo, revenuePrevWeekKobo),
    },
    requestsOverview,
    platformBreakdown,
    statusBreakdown,
    agentsPerformance,
    recentRequests,
    recentTransactions,
  });
}
