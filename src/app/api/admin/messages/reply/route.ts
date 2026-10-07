// Sends a team reply into a client's conversation from the admin inbox.
// Gated to ADMIN_EMAIL.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!user || !adminEmail || user.email !== adminEmail) {
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
  const authorName = typeof body.authorName === "string" && body.authorName.trim() ? body.authorName.trim() : "MetaShield Team";
  if (!userId || !text) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("messages")
    .insert({ user_id: userId, case_id: caseId, from_role: "team", author_name: authorName, body: text })
    .select("id, from_role, author_name, body, created_at")
    .single();

  if (error || !data) {
    console.error("Failed to send admin reply:", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}
