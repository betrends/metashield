// Admin decides a client's cancellation request (or cancels a case
// directly). Approve → cancelled_at set; the case leaves active work.
// Decline → the request is cleared and the case continues. Records are
// kept either way. Gated to ADMIN_EMAIL.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminRole } from "@/lib/admin/auth";
import { postCaseMessage } from "@/lib/server/case-events";

export async function POST(request: Request) {
  const role = await getAdminRole();
  if (!role || role.type !== "admin") return NextResponse.json({ error: "not_authorized" }, { status: 403 });

  let body: { caseId?: unknown; decision?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const decision = body.decision === "approve" ? "approve" : body.decision === "decline" ? "decline" : null;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (!caseId || !decision) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const admin = createAdminClient();
  const { data: kase } = await admin
    .from("cases")
    .select("id, user_id, agent_name, cancelled_at, cancellation_requested_at")
    .eq("id", caseId)
    .maybeSingle();
  if (!kase) return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  if (kase.cancelled_at) return NextResponse.json({ ok: true, unchanged: true });

  const now = new Date().toISOString();
  if (decision === "approve") {
    const { error } = await admin
      .from("cases")
      .update({ cancelled_at: now, cancelled_by: `admin:${role.email}` })
      .eq("id", caseId)
      .is("cancelled_at", null);
    if (error) return NextResponse.json({ error: "update_failed" }, { status: 500 });
    await admin.from("case_timeline_events").insert({ case_id: caseId, event: `Case cancelled by admin${note ? ` — ${note}` : ""}` });
    await postCaseMessage(admin, {
      userId: kase.user_id,
      caseId,
      authorName: kase.agent_name || "MetaShield",
      kind: "system",
      dedupeKey: `cancelled:${caseId}`,
      body: `Your case has been cancelled.${note ? ` ${note}` : ""}`,
    });
    return NextResponse.json({ ok: true, outcome: "cancelled" });
  }

  if (!kase.cancellation_requested_at) return NextResponse.json({ error: "no_request" }, { status: 409 });
  const { error } = await admin.from("cases").update({ cancellation_requested_at: null }).eq("id", caseId);
  if (error) return NextResponse.json({ error: "update_failed" }, { status: 500 });
  await admin.from("case_timeline_events").insert({ case_id: caseId, event: `Cancellation request declined${note ? ` — ${note}` : ""}` });
  await postCaseMessage(admin, {
    userId: kase.user_id,
    caseId,
    authorName: kase.agent_name || "MetaShield",
    kind: "system",
    dedupeKey: `cancel_declined:${caseId}:${Date.now()}`,
    body: `Your cancellation request was reviewed and your case will continue.${note ? ` ${note}` : ""}`,
  });
  return NextResponse.json({ ok: true, outcome: "continued" });
}
