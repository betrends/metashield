// Lists conversations — grouped by client + case — newest first.
// Admins see all conversations; agents see only conversations on their cases.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminRole } from "@/lib/admin/auth";

export async function GET() {
  const role = await getAdminRole();
  if (!role) return NextResponse.json({ error: "not_authorized" }, { status: 403 });

  const admin = createAdminClient();

  let caseFilter: string[] | null = null;
  if (role.type === "agent") {
    const { data: agentCases } = await admin
      .from("cases")
      .select("id")
      .eq("agent_id", role.agentId);
    caseFilter = (agentCases ?? []).map((c) => c.id);
  }

  let messagesQuery = admin
    .from("messages")
    .select("id, user_id, case_id, from_role, author_name, body, created_at")
    .order("created_at", { ascending: false });

  if (caseFilter !== null) {
    if (caseFilter.length === 0) {
      return NextResponse.json({ conversations: [] });
    }
    messagesQuery = messagesQuery.in("case_id", caseFilter);
  }

  const [{ data: messages }, { data: cases }] = await Promise.all([
    messagesQuery,
    admin.from("cases").select("id, title"),
  ]);

  const caseTitleById = new Map((cases ?? []).map((c) => [c.id, c.title]));
  const rows = messages ?? [];

  type Conversation = {
    key: string;
    userId: string;
    caseId: string | null;
    caseTitle: string | null;
    lastMessage: string;
    lastFromRole: "client" | "team";
    lastAt: string;
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
        lastMessage: m.body,
        lastFromRole: m.from_role,
        lastAt: m.created_at,
      });
    }
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
