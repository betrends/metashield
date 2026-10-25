// Full message history for one client+case conversation. The admin may
// open any conversation; an agent only those on their own cases (or the
// "General" thread of a client they handle). Attachments come back with a
// short-lived download link.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { canAccessCase, canAccessClient, getAdminRole } from "@/lib/admin/auth";

type ThreadRow = {
  id: string;
  from_role: "client" | "team";
  author_name: string;
  body: string;
  attachment_name: string | null;
  attachment_path?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  kind?: string | null;
  read_at?: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  const role = await getAdminRole();
  if (!role) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const caseId = searchParams.get("caseId");
  if (!userId) {
    return NextResponse.json({ error: "missing_user_id" }, { status: 400 });
  }

  const allowed = caseId ? await canAccessCase(role, caseId) : await canAccessClient(role, userId);
  if (!allowed) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const admin = createAdminClient();
  // Works before and after migration 010 (which adds attachment_path).
  const load = (withPath: boolean) => {
    let query = admin
      .from("messages")
      .select(
        withPath
          ? "id, from_role, author_name, body, attachment_name, attachment_path, attachment_type, attachment_size, kind, read_at, created_at"
          : "id, from_role, author_name, body, attachment_name, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    query = caseId ? query.eq("case_id", caseId) : query.is("case_id", null);
    return query;
  };

  let { data, error } = await load(true);
  if (error) ({ data, error } = await load(false));
  if (error) {
    console.error("Failed to load thread:", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as ThreadRow[];
  const messages = await Promise.all(
    rows.map(async (m) => {
      let attachment_url: string | null = null;
      if (m.attachment_path) {
        const { data: signed } = await admin.storage
          .from("documents")
          .createSignedUrl(m.attachment_path, 60 * 10); // 10 minutes
        attachment_url = signed?.signedUrl ?? null;
      }
      return {
        id: m.id,
        from_role: m.from_role,
        author_name: m.author_name,
        body: m.body,
        created_at: m.created_at,
        attachment_name: m.attachment_name,
        attachment_type: m.attachment_type ?? null,
        attachment_size: m.attachment_size ?? null,
        kind: m.kind ?? "message",
        read_at: m.read_at ?? null,
        attachment_url,
      };
    })
  );

  return NextResponse.json({ messages });
}
