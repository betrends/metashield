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
