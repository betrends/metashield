// Data for the agent dashboard. An agent always gets their own assigned
// cases. The admin can open any agent's dashboard (?agent=<id>) to see
// exactly what that agent sees; without ?agent the admin gets the list of
// agents to choose from.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminRole } from "@/lib/admin/auth";
import { PAYMENT_COLUMNS } from "@/lib/portal/payments";
import { buildAgentDashboard, caseNumber, type AgentCaseInput } from "@/lib/portal/agent-dashboard";
import type { CaseDocument } from "@/lib/portal/workflow";

const FEED_SIZE = 12;

export async function GET(request: Request) {
  const role = await getAdminRole();
  if (!role) return NextResponse.json({ error: "not_authorized" }, { status: 403 });

  const admin = createAdminClient();
  let agentId: string;
  let agentName: string;

  if (role.type === "agent") {
    agentId = role.agentId;
    agentName = role.agentName;
  } else {
    const { data: agents } = await admin.from("agents").select("id, name, active").order("name", { ascending: true });
    const wanted = new URL(request.url).searchParams.get("agent");
    const chosen = (agents ?? []).find((a) => a.id === wanted);
    if (!chosen) {
      return NextResponse.json({ viewer: "admin", agents: agents ?? [], dashboard: null });
    }
    agentId = chosen.id;
    agentName = chosen.name;
  }

  const { data: caseRows, error } = await admin
    .from("cases")
    .select(
      `id, user_id, title, platform, account_handle, stage, created_at, cancelled_at, cancellation_requested_at, ${PAYMENT_COLUMNS}`
    )
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("agent dashboard: cases query failed", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const rows = caseRows ?? [];
  const ids: string[] = rows.map((r) => r.id as string);
  const userIds: string[] = Array.from(new Set(rows.map((r) => r.user_id as string)));

  const empty = { data: [] as Record<string, unknown>[] };
  const [docsRes, formsRes, msgsRes, eventsRes, profilesRes] = ids.length
    ? await Promise.all([
        admin.from("documents").select("case_id, category, review_status, created_at").in("case_id", ids),
        admin.from("recovery_form_submissions").select("case_id").in("case_id", ids),
        admin
          .from("messages")
          .select("case_id, from_role, body, created_at, read_at")
          .in("case_id", ids)
          .order("created_at", { ascending: false })
          .limit(1000),
        admin
          .from("case_timeline_events")
          .select("case_id, event, created_at")
          .in("case_id", ids)
          .order("created_at", { ascending: false })
          .limit(300),
        admin.from("profiles").select("id, full_name, email").in("id", userIds),
      ])
    : [empty, empty, empty, empty, empty];

  const docsByCase = new Map<string, (CaseDocument & { created_at?: string })[]>();
  for (const d of docsRes.data ?? []) {
    const list = docsByCase.get(d.case_id as string) ?? [];
    list.push(d as unknown as CaseDocument & { created_at?: string });
    docsByCase.set(d.case_id as string, list);
  }
  const formCases = new Set((formsRes.data ?? []).map((f) => f.case_id as string));

  const unread = new Map<string, number>();
  const lastMessage = new Map<string, AgentCaseInput["lastMessage"]>();
  for (const m of msgsRes.data ?? []) {
    const caseId = m.case_id as string;
    if (!lastMessage.has(caseId)) {
      lastMessage.set(caseId, {
        body: (m.body as string) ?? "",
        from_role: m.from_role as string,
        created_at: m.created_at as string,
      });
    }
    if (m.from_role === "client" && !m.read_at) unread.set(caseId, (unread.get(caseId) ?? 0) + 1);
  }

  const lastEvent = new Map<string, string>();
  for (const e of eventsRes.data ?? []) {
    if (!lastEvent.has(e.case_id as string)) lastEvent.set(e.case_id as string, e.created_at as string);
  }

  type Profile = { id: string; full_name: string | null; email: string | null };
  const profiles = new Map<string, Profile>(
    (profilesRes.data ?? []).map((p) => [
      p.id as string,
      { id: p.id as string, full_name: (p.full_name as string | null) ?? null, email: (p.email as string | null) ?? null },
    ])
  );
  // Fall back to the sign-up name/email for clients without a profile row.
  const missing = userIds.filter((u) => !profiles.get(u)?.full_name);
  await Promise.all(
    missing.map(async (u) => {
      const { data } = await admin.auth.admin.getUserById(u);
      const user = data?.user;
      if (user) {
        profiles.set(u, {
          id: u,
          full_name: (user.user_metadata?.full_name as string | undefined) ?? profiles.get(u)?.full_name ?? null,
          email: user.email ?? profiles.get(u)?.email ?? null,
        });
      }
    })
  );

  const inputs: AgentCaseInput[] = rows.map((row) => {
    const p = profiles.get(row.user_id as string);
    return {
      row: row as AgentCaseInput["row"],
      clientName: p?.full_name ?? null,
      clientEmail: p?.email ?? null,
      docs: docsByCase.get(row.id as string) ?? [],
      formSubmitted: formCases.has(row.id as string),
      unread: unread.get(row.id as string) ?? 0,
      lastMessage: lastMessage.get(row.id as string) ?? null,
      lastEventAt: lastEvent.get(row.id as string) ?? null,
    };
  });

  const dashboard = buildAgentDashboard(inputs);
  const titles = new Map(rows.map((r) => [r.id as string, r.title as string]));
  const activity = (eventsRes.data ?? []).slice(0, FEED_SIZE).map((e) => ({
    caseId: e.case_id as string,
    caseNo: caseNumber(e.case_id as string),
    caseTitle: titles.get(e.case_id as string) ?? "",
    event: e.event as string,
    at: e.created_at as string,
  }));

  return NextResponse.json({
    viewer: role.type,
    agent: { id: agentId, name: agentName },
    dashboard: { ...dashboard, activity },
  });
}
