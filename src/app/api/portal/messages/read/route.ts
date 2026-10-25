// Marks the team's messages to the signed-in client as read (optionally
// only for one case). Done on the server because clients have no update
// rights on messages (they can't edit message content).

import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let body: { caseId?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // empty body = all cases
  }
  const caseId = typeof body.caseId === "string" && body.caseId ? body.caseId : null;

  const admin = createAdminClient();
  let query = admin
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("from_role", "team")
    .is("read_at", null);
  if (caseId) query = query.eq("case_id", caseId);
  const { error } = await query;
  if (error) {
    console.error("Mark messages read failed:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
