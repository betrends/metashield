// Sends a team reply into a client's conversation from the staff inbox.
// The admin may reply anywhere; an agent only on their own cases (or the
// "General" thread of a client they handle), and their replies carry
// their own name so the client sees who answered.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { canAccessCase, canAccessClient, getAdminRole } from "@/lib/admin/auth";

export async function POST(request: Request) {
  const role = await getAdminRole();
  if (!role) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  let body: { userId?: unknown; caseId?: unknown; text?: unknown; authorName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const userId = typeof body.userId === "string" ? body.userId : "";
  const caseId = typeof body.caseId === "string" && body.caseId ? body.caseId : null;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const requestedName =
    typeof body.authorName === "string" && body.authorName.trim() ? body.authorName.trim() : "MetaShield Team";
  const authorName = role.type === "agent" ? role.agentName : requestedName;
  if (!userId || !text) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const allowed = caseId ? await canAccessCase(role, caseId) : await canAccessClient(role, userId);
  if (!allowed) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("messages")
    .insert({ user_id: userId, case_id: caseId, from_role: "team", author_name: authorName, body: text })
    .select("id, from_role, author_name, body, attachment_name, created_at")
    .single();

  if (error || !data) {
    console.error("Failed to send admin reply:", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ message: { ...data, attachment_url: null } });
}
