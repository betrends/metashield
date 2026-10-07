// Lists every agent with a computed caseload/performance summary, and
// creates new ones. Gated to ADMIN_EMAIL, same as every other admin
// route — this is how the admin manages their team.

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

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const adminClient = createAdminClient();

  const { data: agents, error } = await adminClient
    .from("agents")
    .select("id, name, email, phone, active, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to list agents:", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const withStats = await Promise.all(
    (agents ?? []).map(async (agent) => {
      const [{ count: resolved }, { count: total }] = await Promise.all([
        adminClient
          .from("cases")
          .select("id", { count: "exact", head: true })
          .eq("agent_id", agent.id)
          .eq("stage", "Resolved"),
        adminClient
          .from("cases")
          .select("id", { count: "exact", head: true })
          .eq("agent_id", agent.id),
      ]);
      const resolvedCount = resolved ?? 0;
      const totalCount = total ?? 0;
      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        active: agent.active,
        createdAt: agent.created_at,
        resolvedCount,
        inProgressCount: totalCount - resolvedCount,
        totalCount,
        successRate: totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0,
      };
    })
  );

  return NextResponse.json({ agents: withStats });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  let body: { name?: unknown; email?: unknown; phone?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!name || !email || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Create (or update) the Supabase auth account so the agent can log in immediately.
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u) => u.email === email);

  if (existing) {
    await adminClient.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
  } else {
    const { error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (authError) {
      console.error("Failed to create auth user for agent:", authError);
      return NextResponse.json({ error: "auth_failed", detail: authError.message }, { status: 500 });
    }
  }

  const { data, error } = await adminClient
    .from("agents")
    .insert({ name, email, phone: phone || null })
    .select("id, name, email, phone, active, created_at")
    .single();

  if (error || !data) {
    console.error("Failed to create agent:", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({
    agent: {
      ...data,
      resolvedCount: 0,
      inProgressCount: 0,
      totalCount: 0,
      successRate: 0,
    },
  });
}
