// Moves a case to a new stage on staff's behalf (the client-side
// updateCaseStage in lib/portal/data.ts only works for the case's own
// owner via RLS — this is the staff-on-anyone's-case equivalent). Every
// stage change logs a timeline event, a message from the agent, and
// emails the client — recovery should never advance silently.
//
// The admin may move any case; an agent only cases assigned to them.
// Nobody can move an unpaid case past "Payment Pending" — confirm the
// payment first (see /api/admin/payments/confirm).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendCaseUpdateEmail } from "@/lib/email/case-update";
import { canAccessCase, getAdminRole } from "@/lib/admin/auth";
import { canMoveToStage, type PaymentStatus } from "@/lib/portal/case-rules";
import type { CaseStage } from "@/lib/portal/mock-data";

const VALID_STAGES = [
  "New Lead",
  "Assessment Pending",
  "Payment Pending",
  "Documents Required",
  "Under Review",
  "Recovery Process",
  "Awaiting Platform Response",
  "Resolved",
];

export async function POST(request: Request) {
  const role = await getAdminRole();
  if (!role) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  let body: { caseId?: unknown; stage?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const stage = typeof body.stage === "string" ? body.stage : "";
  if (!caseId || !VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (!(await canAccessCase(role, caseId))) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: current, error: readError } = await admin
    .from("cases")
    .select("stage, payment_status")
    .eq("id", caseId)
    .maybeSingle();
  if (readError || !current) {
    return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  }
  if (current.stage === stage) {
    return NextResponse.json({ ok: true, unchanged: true, stage });
  }
  const allowed = canMoveToStage(stage as CaseStage, current.payment_status as PaymentStatus);
  if (!allowed.ok) {
    return NextResponse.json(
      {
        error: allowed.reason,
        message: "Confirm this case's payment before moving it past Payment Pending.",
      },
      { status: 409 }
    );
  }

  const { data: updatedCase, error } = await admin
    .from("cases")
    .update({ stage })
    .eq("id", caseId)
    .select("id, title, user_id, agent_name")
    .single();

  if (error || !updatedCase) {
    console.error("Failed to advance case stage:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  await admin.from("case_timeline_events").insert({
    case_id: caseId,
    event: `Moved to ${stage}`,
  });

  const isResolved = stage === "Resolved";
  await admin.from("messages").insert({
    user_id: updatedCase.user_id,
    case_id: caseId,
    from_role: "team",
    author_name: updatedCase.agent_name || "Your agent",
    body: isResolved
      ? "Great news — your case is resolved! Reach out any time if you need anything else."
      : `Update: your case has moved to "${stage}". I'll keep you posted as it progresses.`,
  });

  const { data: clientData } = await admin.auth.admin.getUserById(updatedCase.user_id);
  const clientEmail = clientData?.user?.email;
  if (clientEmail) {
    await sendCaseUpdateEmail({
      to: clientEmail,
      kind: "stage_changed",
      clientName: (clientData?.user?.user_metadata?.full_name as string | undefined) || "there",
      caseTitle: updatedCase.title,
      stage,
    });
  }

  return NextResponse.json({ ok: true, stage });
}
