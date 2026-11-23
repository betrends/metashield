// The "account recovered" dashboard banner for one client (admin only).
// GET    → { notice: { id, createdAt, dismissedAt } | null }
// POST   → add it (or show it again if the client closed it)
// DELETE → remove it

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";

async function isAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!user && !!adminEmail && user.email === adminEmail;
}

async function current(userId: string) {
  const { data, error } = await createAdminClient()
    .from("client_notices")
    .select("id, created_at, dismissed_at")
    .eq("user_id", userId)
    .eq("kind", "recovered")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data: data as { id: string; created_at: string; dismissed_at: string | null } | null, error };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  const { id } = await params;
  const { data, error } = await current(id);
  if (error) return NextResponse.json({ notice: null, missingTable: true });
  return NextResponse.json({
    notice: data ? { id: data.id, createdAt: data.created_at, dismissedAt: data.dismissed_at } : null,
  });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  const { id } = await params;
  const admin = createAdminClient();
  const { data: existing } = await current(id);
  const { error } = existing
    ? await admin
        .from("client_notices")
        .update({ dismissed_at: null, created_at: new Date().toISOString() })
        .eq("id", existing.id)
    : await admin.from("client_notices").insert({ user_id: id, kind: "recovered" });
  if (error) {
    console.error("client notice add failed:", error);
    return NextResponse.json({ error: "save_failed", message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  const { id } = await params;
  const { error } = await createAdminClient().from("client_notices").delete().eq("user_id", id).eq("kind", "recovered");
  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
