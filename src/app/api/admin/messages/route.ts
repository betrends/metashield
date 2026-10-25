// Lists conversations — grouped by client + case — newest first.
// Admins see all conversations; agents see conversations on their cases,
// plus the unlinked "General" conversation of any client they handle
// (client messages used to be saved without a case_id, which hid every
// client reply from agents).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminRole } from "@/lib/admin/auth";

export async function GET() {
  const role = await getAdminRole();
  if (!role) return NextResponse.json({ error: "not_authorized" }, { status: 403 });

  const admin = createAdminClient();

  let caseFilter: string[] | null = null;
  let clientFilter: string[] = [];
  if (role.type === "agent") {
    const { data: agentCases } = await admin
      .from("cases")
      .select("id, user_id")
      .eq("agent_id", role.agentId);
    caseFilter = (agentCases ?? []).map((c) => c.id);
    clientFilter = Array.from(new Set((agentCases ?? []).map((c) => c.user_id as string)));
  }

  const select = "id, user_id, case_id, from_role, author_name, body, attachment_name, created_at, read_at";
  const baseQuery = () => admin.from("messages").select(select).order("created_at", { ascending: false });

  let messagesQuery;
  if (caseFilter !== null) {
    if (caseFilter.length === 0) {
      return NextResponse.json({ conversations: [] });
    }
    messagesQuery = Promise.all([
      baseQuery().in("case_id", caseFilter),
      baseQuery().is("case_id", null).in("user_id", clientFilter),
    ]).then(([byCase, general]) => ({
      data: [...(byCase.data ?? []), ...(general.data ?? [])],
      error: byCase.error ?? general.error,
    }));
  } else {
    messagesQuery = baseQuery();
  }

  const [{ data: messages, error: messagesError }, { data: cases }] = await Promise.all([
    messagesQuery,
    admin.from("cases").select("id, title"),
  ]);
  if (messagesError) {
    console.error("Failed to list messages:", messagesError);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const caseTitleById = new Map((cases ?? []).map((c) => [c.id, c.title]));
  const rows = [...(messages ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  type Conversation = {
    key: string;
    userId: string;
    caseId: string | null;
    caseTitle: string | null;
    lastMessage: string;
    lastFromRole: "client" | "team";
    lastAt: string;
    unread: number;
  };

  const conversations = new Map<string, Conversation>();
  for (const m of rows) {
    const key = `${m.user_id}:${m.case_id ?? "general"}`;
    if (!conversations.has(key)) {
      conversations.set(key, {
        key,
        userId: m.user_id,
        caseId: m.case_id,
        caseTitle: m.case_id ? caseTitleById.get(m.case_id) ?? null : null,
        lastMessage: m.attachment_name ? `📎 ${m.attachment_name} — ${m.body}` : m.body,
        lastFromRole: m.from_role,
        lastAt: m.created_at,
        unread: 0,
      });
    }
    // Unread = client messages staff haven't opened yet.
    if (m.from_role === "client" && !m.read_at) conversations.get(key)!.unread += 1;
  }

  const list = Array.from(conversations.values()).sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
  );

  const withClients = await Promise.all(
    list.map(async (c) => {
      const { data: userData } = await admin.auth.admin.getUserById(c.userId);
      return {
        ...c,
        clientName: (userData?.user?.user_metadata?.full_name as string | undefined) || null,
        clientEmail: userData?.user?.email || null,
      };
    })
  );

  return NextResponse.json({ conversations: withClients });
}
