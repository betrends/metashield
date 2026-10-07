// Monthly rollups for the admin Reports page — requests and confirmed
// revenue for the last 6 months, plus all-time platform and issue
// breakdowns. Gated to ADMIN_EMAIL.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";

const PAYMENT_CONFIRMED_EVENT = "Payment confirmed — recovery started";
const MONTHS_BACK = 6;

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

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

  const [{ data: casesData }, { data: invoicesData }, { data: confirmEvents }] = await Promise.all([
    admin.from("cases").select("id, platform, issue, fee_amount_kobo, payment_status, created_at"),
    admin.from("invoices").select("amount_kobo, created_at").eq("status", "paid").not("subscription_id", "is", null),
    admin.from("case_timeline_events").select("case_id, created_at").eq("event", PAYMENT_CONFIRMED_EVENT),
  ]);

  const cases = casesData ?? [];
  const invoices = invoicesData ?? [];
  const confirmations = confirmEvents ?? [];
  const casesById = new Map(cases.map((c) => [c.id, c]));

  // ── Monthly rollup ───────────────────────────────────────────────────
  const months: { key: string; label: string; requests: number; revenueKobo: number }[] = [];
  const now = new Date();
  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: monthLabel(key), requests: 0, revenueKobo: 0 });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));

  for (const c of cases) {
    const idx = monthIndex.get(monthKey(c.created_at));
    if (idx !== undefined) months[idx].requests += 1;
  }
  for (const e of confirmations) {
    const idx = monthIndex.get(monthKey(e.created_at));
    const fee = casesById.get(e.case_id)?.fee_amount_kobo ?? 0;
    if (idx !== undefined) months[idx].revenueKobo += fee;
  }
  for (const inv of invoices) {
    const idx = monthIndex.get(monthKey(inv.created_at));
    if (idx !== undefined) months[idx].revenueKobo += inv.amount_kobo ?? 0;
  }

  // ── All-time platform breakdown ─────────────────────────────────────
  const platformCounts = new Map<string, number>();
  for (const c of cases) platformCounts.set(c.platform, (platformCounts.get(c.platform) ?? 0) + 1);
  const platformBreakdown = Array.from(platformCounts.entries())
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);

  // ── All-time issue breakdown ─────────────────────────────────────────
  const issueCounts = new Map<string, number>();
  for (const c of cases) {
    const issue = c.issue || "Not specified";
    issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
  }
  const issueBreakdown = Array.from(issueCounts.entries())
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count);

  const totalRevenueKobo =
    cases.filter((c) => c.payment_status === "paid").reduce((s, c) => s + (c.fee_amount_kobo ?? 0), 0) +
    invoices.reduce((s, i) => s + (i.amount_kobo ?? 0), 0);

  return NextResponse.json({
    months,
    platformBreakdown,
    issueBreakdown,
    totals: {
      totalRequests: cases.length,
      totalRevenueKobo,
    },
  });
}
