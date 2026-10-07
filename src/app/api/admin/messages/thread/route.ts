// Full message history for one client+case conversation. Gated to
// ADMIN_EMAIL.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!user || !adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const caseId = searchParams.get("caseId");
  if (!userId) {
    return NextResponse.json({ error: "missing_user_id" }, { status: 400 });
  }

  const admin = createAdminClient();
  let query = admin
    .from("messages")
    .select("id, from_role, author_name, body, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  query = caseId ? query.eq("case_id", caseId) : query.is("case_id", null);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to load thread:", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}
