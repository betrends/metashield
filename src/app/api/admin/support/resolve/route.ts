// Marks a support ticket resolved (or reopens it). Gated to ADMIN_EMAIL.

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

  let body: { id?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status === "open" ? "open" : "resolved";
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("contact_submissions").update({ status }).eq("id", id);
  if (error) {
    console.error("Failed to update ticket status:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
