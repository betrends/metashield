// Moves a case to a new stage on staff's behalf (the client-side
// updateCaseStage in lib/portal/data.ts only works for the case's own
// owner via RLS — this is the staff-on-anyone's-case equivalent). Every
// stage change logs a timeline event, a message from the agent, and
// emails the client — recovery should never advance silently.
//
// The admin may move any case; an agent only cases assigned to them.
// Nobody can move an unpaid case past "Payment Pending" — confirm the
// payment first (see /api/admin/payments/confirm).
//
// Moving a case to "Resolved" records the recovery as completed: the
// completion time is saved once, the final balance (total − deposit) is
// fixed, and it falls due 24 hours later. Re-resolving a case never
// restarts that clock.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendCaseUpdateEmail } from "@/lib/email/case-update";
import { canAccessCase, getAdminRole } from "@/lib/admin/auth";
import { canMoveToStage, type PaymentStatus } from "@/lib/portal/case-rules";
import type { CaseStage } from "@/lib/portal/mock-data";
import { formatNaira } from "@/lib/portal/case-fees";
import { completionUpdate, PAYMENT_COLUMNS, pickPaymentRecord, summarizePayment } from "@/lib/portal/payments";

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
    .select(`stage, ${PAYMENT_COLUMNS}`)
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

  const now = new Date();
  const completion = stage === "Resolved" ? completionUpdate(pickPaymentRecord(current), now) : null;

  const returning = `id, title, user_id, agent_name, ${PAYMENT_COLUMNS}`;
  let completionRecorded = false;
  let { data: updatedCase, error } = completion
    ? // Only the request that actually records completion sets the clock.
      await admin
        .from("cases")
        .update({ stage, ...completion })
        .eq("id", caseId)
        .is("recovery_completed_at", null)
        .select(returning)
        .maybeSingle()
    : { data: null, error: null };
  if (completion && updatedCase) completionRecorded = true;
  if (!updatedCase && !error) {
    ({ data: updatedCase, error } = await admin
      .from("cases")
      .update({ stage })
      .eq("id", caseId)
      .select(returning)
      .single());
  }

  if (error || !updatedCase) {
    console.error("Failed to advance case stage:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  const payment = summarizePayment(pickPaymentRecord(updatedCase), now);
  const events = [`Moved to ${stage}`];
  if (completionRecorded) {
    events.push(
      payment.balanceKobo > 0
        ? `Recovery completed — final balance of ${formatNaira(payment.balanceKobo)} due by ${formatDeadline(payment.balanceDueAt)}`
        : "Recovery completed — nothing further to pay"
    );
  }
  await admin.from("case_timeline_events").insert(events.map((event) => ({ case_id: caseId, event })));

  const isResolved = stage === "Resolved";
  await admin.from("messages").insert({
    user_id: updatedCase.user_id,
    case_id: caseId,
    from_role: "team",
    author_name: updatedCase.agent_name || "Your agent",
    body: isResolved
      ? completionRecorded && payment.balanceKobo > 0
        ? `Great news — your recovery is complete! The remaining 50% of your fee, ${formatNaira(
            payment.balanceKobo
          )}, is now due by ${formatDeadline(
            payment.balanceDueAt
          )} (24 hours from completion). You can pay by bank transfer and upload the receipt from your case page.`
        : "Great news — your case is resolved! Reach out any time if you need anything else."
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

function formatDeadline(iso: string | null): string {
  if (!iso) return "the deadline";
  return new Date(iso).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }) + " (WAT)";
}
