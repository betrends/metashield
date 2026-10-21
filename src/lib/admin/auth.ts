import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";

export type AdminRole =
  | { type: "admin"; userId: string; email: string }
  | { type: "agent"; userId: string; email: string; agentId: string; agentName: string };

export async function getAdminRole(): Promise<AdminRole | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  if (user.email === process.env.ADMIN_EMAIL) {
    return { type: "admin", userId: user.id, email: user.email };
  }

  const adminClient = createAdminClient();
  const { data: agent } = await adminClient
    .from("agents")
    .select("id, name")
    .eq("email", user.email)
    .eq("active", true)
    .maybeSingle();

  if (agent) {
    return {
      type: "agent",
      userId: user.id,
      email: user.email,
      agentId: agent.id,
      agentName: agent.name,
    };
  }

  return null;
}

// Whether a staff member may act on one case: the admin may act on any
// case, an agent only on cases assigned to them. Several routes used to
// check ADMIN_EMAIL alone, which locked agents out of their own cases'
// messages and stage changes.
export async function canAccessCase(role: AdminRole, caseId: string): Promise<boolean> {
  if (role.type === "admin") return true;
  const admin = createAdminClient();
  const { data } = await admin.from("cases").select("agent_id").eq("id", caseId).maybeSingle();
  return !!data && data.agent_id === role.agentId;
}

// Whether a staff member may see a client's general (not case-linked)
// conversation: the admin always, an agent only if that client has at
// least one case assigned to them.
export async function canAccessClient(role: AdminRole, userId: string): Promise<boolean> {
  if (role.type === "admin") return true;
  const admin = createAdminClient();
  const { count } = await admin
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("agent_id", role.agentId);
  return (count ?? 0) > 0;
}
