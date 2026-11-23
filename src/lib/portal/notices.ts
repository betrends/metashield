// Personal dashboard banners the team adds from the admin client page
// (table client_notices, migration 024). Clients only see and close their own.
import { createClient } from "@/lib/supabase/client";

export type ClientNotice = { id: string; kind: "recovered"; createdAt: string };

export async function fetchOpenNotices(): Promise<ClientNotice[]> {
  const { data, error } = await createClient()
    .from("client_notices")
    .select("id, kind, created_at")
    .is("dismissed_at", null)
    .order("created_at", { ascending: false });
  if (error || !data) return []; // table not created yet → no banners
  return (data as { id: string; kind: "recovered"; created_at: string }[]).map((n) => ({
    id: n.id,
    kind: n.kind,
    createdAt: n.created_at,
  }));
}

export async function dismissNotice(id: string): Promise<void> {
  await createClient().from("client_notices").update({ dismissed_at: new Date().toISOString() }).eq("id", id);
}
