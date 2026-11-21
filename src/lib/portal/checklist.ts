// The protection checklist on the client dashboard: which of the 6 steps
// (lib/protection-steps.ts) the client has marked as done, and how that
// lifts the account health shown in the portal.
import { createClient } from "@/lib/supabase/client";
import { CHECKLIST_DO } from "@/lib/protection-steps";
import type { InstagramStep } from "@/lib/instagram-links";

export const CHECKLIST_TOTAL = CHECKLIST_DO.length;

// Health shown after the checklist: each done step closes an equal share of
// the gap to 95, so all six done = 95 (never lowers a score that's already
// higher). The underlying assessment score isn't changed.
export const CHECKLIST_MAX_HEALTH = 95;

export function healthWithChecklist(health: number, doneCount: number): number {
  const done = Math.max(0, Math.min(CHECKLIST_TOTAL, doneCount));
  if (health >= CHECKLIST_MAX_HEALTH || done === 0) return health;
  return Math.round(health + ((CHECKLIST_MAX_HEALTH - health) * done) / CHECKLIST_TOTAL);
}

export async function fetchChecklistDone(): Promise<Set<InstagramStep>> {
  const { data, error } = await createClient().from("protection_checklist").select("step");
  if (error) return new Set(); // table not created yet → nothing done
  return new Set((data as { step: InstagramStep }[]).map((r) => r.step));
}

export async function setChecklistStep(step: InstagramStep, done: boolean): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = done
    ? await supabase.from("protection_checklist").upsert({ user_id: user.id, step }, { onConflict: "user_id,step" })
    : await supabase.from("protection_checklist").delete().eq("user_id", user.id).eq("step", step);
  if (error) throw error;
}
