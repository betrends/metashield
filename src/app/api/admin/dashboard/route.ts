// One aggregated payload for the admin Dashboard — stats, the requests
// trend, platform/status breakdowns, agent performance, and recent
// activity — all derived from real rows so nothing here is invented.
// Gated to ADMIN_EMAIL.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";
import type { CaseStage } from "@/lib/portal/mock-data";

const IN_PROGRESS_STAGES: CaseStage[] = ["Under Review", "Recovery Process", "Awaiting Platform Response"];
const DAY_MS = 24 * 60 * 60 * 1000;
const PAYMENT_CONFIRMED_EVENT = "Payment confirmed — recovery started";

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
  agent_id: string | null;
  agent_name: string | null;
  created_at: string;
};

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
          "id, user_id, title, platform, account_handle, stage, payment_status, fee_amount_kobo, agent_id, agent_name, created_at"
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
        .eq("event", PAYMENT_CONFIRMED_EVENT)
        .order("created_at", { ascending: false }),
    ]);

  const cases = (casesData ?? []) as CaseRow[];
  const agents = agentsData ?? [];
  const invoices = invoicesData ?? [];
  const confirmations = confirmEvents ?? [];
  const casesById = new Map(cases.map((c) => [c.id, c]));

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

  const caseRevenueKobo = cases
    .filter((c) => c.payment_status === "paid")
    .reduce((sum, c) => sum + (c.fee_amount_kobo ?? 0), 0);
  const subscriptionRevenueKobo = invoices.reduce((sum, inv) => sum + (inv.amount_kobo ?? 0), 0);
  const totalRevenueKobo = caseRevenueKobo + subscriptionRevenueKobo;

  const revenueThisWeekKobo =
    confirmations
      .filter((e) => new Date(e.created_at).getTime() >= weekStart)
      .reduce((sum, e) => sum + (casesById.get(e.case_id)?.fee_amount_kobo ?? 0), 0) +
    invoices
      .filter((i) => new Date(i.created_at).getTime() >= weekStart)
      .reduce((sum, i) => sum + (i.amount_kobo ?? 0), 0);
  const revenuePrevWeekKobo =
    confirmations
      .filter((e) => {
        const t = new Date(e.created_at).getTime();
        return t >= prevWeekStart && t < weekStart;
      })
      .reduce((sum, e) => sum + (casesById.get(e.case_id)?.fee_amount_kobo ?? 0), 0) +
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
        agentName: c.agent_name,
        createdAt: c.created_at,
      };
    })
  );

  // ── Recent transactions (case payments + subscription invoices) ─────
  const caseTransactions = confirmations.map((e) => {
    const c = casesById.get(e.case_id);
    return {
      id: `case-${e.case_id}`,
      kind: "case" as const,
      label: c?.title ?? "Recovery case",
      userId: c?.user_id ?? null,
      amountKobo: c?.fee_amount_kobo ?? 0,
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

  return NextResponse.json({
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
