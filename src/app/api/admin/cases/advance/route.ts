// Moves a case to a new stage on staff's behalf. Every change is recorded
// in case_stage_history (who, from, to, when, why), logged on the
// timeline, messaged to the client and emailed.
//
// Rules (lib/portal/workflow.ts):
//  - The admin may act on any case, an agent only on cases assigned to them.
//  - Only valid next stages are allowed (e.g. Under Review → Recovery
//    Process, not Payment Pending → Resolved).
//  - Under Review → Recovery Process needs the required documents approved.
//  - An admin can correct a case to any stage with a written reason
//    ({ correction: true, reason }); it is recorded as a correction.
//  - Nobody can move an unpaid case past "Payment Pending", and cancelled
//    cases can't be moved.
//  - Moving to "Resolved" records recovery completion once and makes the
//    final 50% due 24 hours later; client and team are emailed.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendCaseUpdateEmail } from "@/lib/email/case-update";
import { sendStaffAlert } from "@/lib/email/staff-alert";
import { canAccessCase, getAdminRole } from "@/lib/admin/auth";
import { canMoveToStage, type PaymentStatus } from "@/lib/portal/case-rules";
import { caseStages, type CaseStage } from "@/lib/portal/mock-data";
import { formatNaira } from "@/lib/portal/case-fees";
import { completionUpdate, PAYMENT_COLUMNS, pickPaymentRecord, summarizePayment } from "@/lib/portal/payments";
import { documentsApproved, isAllowedTransition, type CaseDocument } from "@/lib/portal/workflow";
import { postCaseMessage, recordStageChange } from "@/lib/server/case-events";

export async function POST(request: Request) {
  const role = await getAdminRole();
  if (!role) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  let body: { caseId?: unknown; stage?: unknown; correction?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const stage = typeof body.stage === "string" ? (body.stage as CaseStage) : ("" as CaseStage);
  const correction = body.correction === true;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!caseId || !caseStages.includes(stage)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (!(await canAccessCase(role, caseId))) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: current, error: readError } = await admin
    .from("cases")
    .select(`stage, cancelled_at, ${PAYMENT_COLUMNS}`)
    .eq("id", caseId)
    .maybeSingle();
  if (readError || !current) {
    return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  }
  const from = current.stage as CaseStage;
  if (from === stage) {
    return NextResponse.json({ ok: true, unchanged: true, stage });
  }
  if (current.cancelled_at) {
    return NextResponse.json({ error: "case_cancelled", message: "This case has been cancelled." }, { status: 409 });
  }
  const paid = canMoveToStage(stage, current.payment_status as PaymentStatus);
  if (!paid.ok) {
    return NextResponse.json(
      { error: paid.reason, message: "Confirm this case's deposit before moving it past Payment Pending." },
      { status: 409 }
    );
  }

  const isCorrection = !isAllowedTransition(from, stage);
  if (isCorrection) {
    if (role.type !== "admin" || !correction) {
      return NextResponse.json(
        {
          error: "invalid_transition",
          message: `"${stage}" isn't a valid next step from "${from}".${role.type === "admin" ? " Use Correct stage and give a reason." : ""}`,
        },
        { status: 409 }
      );
    }
    if (reason.length < 5) {
      return NextResponse.json({ error: "reason_required", message: "Please give a reason for the correction." }, { status: 400 });
    }
  }

  if (!isCorrection && from === "Under Review" && stage === "Recovery Process") {
    const { data: docs } = await admin.from("documents").select("category, review_status").eq("case_id", caseId);
    if (!documentsApproved((docs ?? []) as CaseDocument[])) {
      return NextResponse.json(
        { error: "documents_not_approved", message: "Approve the required documents before starting the recovery." },
        { status: 409 }
      );
    }
  }

  const now = new Date();
  const completion = stage === "Resolved" ? completionUpdate(pickPaymentRecord(current), now) : null;
  const returning = `id, title, user_id, agent_name, agent_email, ${PAYMENT_COLUMNS}`;

  // Conditional on the stage we validated, so two people changing the
  // stage at once can't both succeed.
  let query = admin
    .from("cases")
    .update({ stage, ...(completion ?? {}) })
    .eq("id", caseId)
    .eq("stage", from);
  if (completion) query = query.is("recovery_completed_at", null);
  let { data: updatedCase, error } = await query.select(returning).maybeSingle();
  let completionRecorded = !!(completion && updatedCase);
  if (!updatedCase && !error && completion) {
    // Completion was already recorded earlier (re-resolving): move the
    // stage without restarting the 24-hour clock.
    ({ data: updatedCase, error } = await admin
      .from("cases")
      .update({ stage })
      .eq("id", caseId)
      .eq("stage", from)
      .select(returning)
      .maybeSingle());
    completionRecorded = false;
  }
  if (error) {
    console.error("Failed to advance case stage:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  if (!updatedCase) {
    return NextResponse.json(
      { error: "stage_changed_meanwhile", message: "This case was just updated by someone else — refresh and try again." },
      { status: 409 }
    );
  }

  await recordStageChange(admin, {
    caseId,
    from,
    to: stage,
    actor: { role: role.type, name: role.type === "agent" ? role.agentName : role.email },
    reason: reason || null,
    isCorrection,
  });

  const payment = summarizePayment(pickPaymentRecord(updatedCase), now);
  const deadline = formatDeadline(payment.balanceDueAt);
  if (completionRecorded) {
    await admin.from("case_timeline_events").insert({
      case_id: caseId,
      event:
        payment.balanceKobo > 0
          ? `Recovery completed — final balance of ${formatNaira(payment.balanceKobo)} due by ${deadline}`
          : "Recovery completed — nothing further to pay",
    });
  }

  const isResolved = stage === "Resolved";
  await postCaseMessage(admin, {
    userId: updatedCase.user_id,
    caseId,
    authorName: updatedCase.agent_name || "Your agent",
    kind: "system",
    body: isResolved
      ? completionRecorded && payment.balanceKobo > 0
        ? `Great news — your recovery is complete! The remaining 50% of your fee, ${formatNaira(
            payment.balanceKobo
          )}, is now due by ${deadline} (24 hours from completion). You can pay by bank transfer and upload the receipt from your case page.`
        : "Great news — your case is resolved! Reach out any time if you need anything else."
      : `Update: your case has moved to "${stage}". I'll keep you posted as it progresses.`,
  });

  const { data: clientData } = await admin.auth.admin.getUserById(updatedCase.user_id);
  const clientEmail = clientData?.user?.email;
  const clientName = (clientData?.user?.user_metadata?.full_name as string | undefined) || "there";
  if (clientEmail) {
    await sendCaseUpdateEmail(
      completionRecorded && payment.balanceKobo > 0
        ? {
            to: clientEmail,
            kind: "balance_due",
            clientName,
            caseTitle: updatedCase.title,
            balance: formatNaira(payment.balanceKobo),
            deadline,
          }
        : { to: clientEmail, kind: "stage_changed", clientName, caseTitle: updatedCase.title, stage }
    );
  }
  if (completionRecorded && payment.balanceKobo > 0) {
    await sendStaffAlert({
      subject: `Balance due: ${updatedCase.title}`,
      lines: [
        `Recovery completed for ${clientName}${clientEmail ? ` (${clientEmail})` : ""}.`,
        `Final balance ${formatNaira(payment.balanceKobo)} is due by ${deadline}.`,
      ],
      link: "/admin/payments",
      to: [updatedCase.agent_email],
    });
  }

  return NextResponse.json({ ok: true, stage, correction: isCorrection });
}

function formatDeadline(iso: string | null): string {
  if (!iso) return "the deadline";
  return (
    new Date(iso).toLocaleString("en-NG", {
      timeZone: "Africa/Lagos",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }) + " (WAT)"
  );
}
