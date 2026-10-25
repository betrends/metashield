// Marks a client's messages in one conversation as read by staff. The
// admin may do this for any conversation, an agent only for their own
// cases (or the general thread of a client they handle).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { canAccessCase, canAccessClient, getAdminRole } from "@/lib/admin/auth";

export async function POST(request: Request) {
  const role = await getAdminRole();
  if (!role) return NextResponse.json({ error: "not_authorized" }, { status: 403 });

  let body: { userId?: unknown; caseId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const userId = typeof body.userId === "string" ? body.userId : "";
  const caseId = typeof body.caseId === "string" && body.caseId ? body.caseId : null;
  if (!userId) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const allowed = caseId ? await canAccessCase(role, caseId) : await canAccessClient(role, userId);
  if (!allowed) return NextResponse.json({ error: "not_authorized" }, { status: 403 });

  const admin = createAdminClient();
  let query = admin
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("from_role", "client")
    .is("read_at", null);
  query = caseId ? query.eq("case_id", caseId) : query.is("case_id", null);
  const { error } = await query;
  if (error) {
    console.error("Staff mark-read failed:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
