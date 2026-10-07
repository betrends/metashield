// Edits one agent — name/email/phone, or toggling active (an inactive
// agent stops being picked for new cases but keeps their case history
// and existing assignments). Gated to ADMIN_EMAIL.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!user || !adminEmail || user.email !== adminEmail) {
    return null;
  }
  return user;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }
  const { id } = await params;

  let body: { name?: unknown; email?: unknown; phone?: unknown; active?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const update: Record<string, string | boolean | null> = {};
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body.email === "string" && body.email.trim()) update.email = body.email.trim();
  if (typeof body.phone === "string") update.phone = body.phone.trim() || null;
  if (typeof body.active === "boolean") update.active = body.active;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("agents")
    .update(update)
    .eq("id", id)
    .select("id, name, email, phone, active, created_at")
    .single();

  if (error || !data) {
    console.error("Failed to update agent:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ agent: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }
  const { id } = await params;
  const adminClient = createAdminClient();

  // Find all non-resolved cases assigned to this agent
  const { data: cases } = await adminClient
    .from("cases")
    .select("id")
    .eq("agent_id", id)
    .neq("stage", "Resolved");

  if (cases && cases.length > 0) {
    // Find other active agents to reassign to
    const { data: others } = await adminClient
      .from("agents")
      .select("id")
      .eq("active", true)
      .neq("id", id);

    if (others && others.length > 0) {
      // Round-robin reassign across remaining agents
      await Promise.all(
        cases.map((c, i) =>
          adminClient
            .from("cases")
            .update({ agent_id: others[i % others.length].id })
            .eq("id", c.id)
        )
      );
    } else {
      // No other agents — unassign
      await adminClient
        .from("cases")
        .update({ agent_id: null })
        .eq("agent_id", id);
    }
  }

  // Delete the agent row
  const { error } = await adminClient.from("agents").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete agent:", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
