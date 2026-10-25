// Server-only helpers for writing case events consistently: stage changes
// (always recorded in case_stage_history with who/what made them) and
// automatic chat messages (de-duplicated with a key, so a refresh, retry
// or repeated request never posts the same message twice).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaseStage } from "@/lib/portal/mock-data";

export type Actor = { role: "system" | "admin" | "agent" | "client"; name?: string | null };

export async function recordStageChange(
  admin: SupabaseClient,
  input: { caseId: string; from: CaseStage | null; to: CaseStage; actor: Actor; reason?: string | null; isCorrection?: boolean }
) {
  const { error } = await admin.from("case_stage_history").insert({
    case_id: input.caseId,
    from_stage: input.from,
    to_stage: input.to,
    actor_role: input.actor.role,
    actor: input.actor.name ?? null,
    reason: input.reason ?? null,
    is_correction: !!input.isCorrection,
  });
  if (error) console.error("Failed to record stage history:", error, input);
  const { error: tlError } = await admin.from("case_timeline_events").insert({
    case_id: input.caseId,
    event: input.isCorrection ? `Stage corrected to ${input.to}` : `Moved to ${input.to}`,
  });
  if (tlError) console.error("Failed to record timeline event:", tlError, input);
}

// Moves a case only if it is still in `from` (so concurrent changes
// can't overwrite each other) and records the change. Returns true if
// this call made the move.
export async function moveStage(
  admin: SupabaseClient,
  input: { caseId: string; from: CaseStage; to: CaseStage; actor: Actor; reason?: string | null; isCorrection?: boolean }
): Promise<boolean> {
  const { data, error } = await admin
    .from("cases")
    .update({ stage: input.to })
    .eq("id", input.caseId)
    .eq("stage", input.from)
    .is("cancelled_at", null)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Failed to move case stage:", error, input);
    return false;
  }
  if (!data) return false;
  await recordStageChange(admin, input);
  return true;
}

// Posts a team/system message once per dedupe key. Returns true if this
// call created it, false if it already existed (or failed, logged).
export async function postCaseMessage(
  admin: SupabaseClient,
  input: {
    userId: string;
    caseId: string;
    authorName: string;
    body: string;
    dedupeKey?: string;
    kind?: "message" | "system" | "form_request";
    metadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  const { error } = await admin.from("messages").insert({
    user_id: input.userId,
    case_id: input.caseId,
    from_role: "team",
    author_name: input.authorName,
    body: input.body,
    dedupe_key: input.dedupeKey ?? null,
    kind: input.kind ?? "system",
    metadata: input.metadata ?? null,
  });
  if (!error) return true;
  if (error.code === "23505") return false; // already posted
  console.error("Failed to post case message:", error, { caseId: input.caseId, dedupeKey: input.dedupeKey });
  return false;
}
