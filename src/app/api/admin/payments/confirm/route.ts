// Admin verifies a bank-transfer installment against the bank statement
// and records it as paid. Gated to ADMIN_EMAIL (agents can see payment
// status but cannot confirm money).
//
// Body: { caseId, kind?: "deposit" | "balance" }  (kind defaults to deposit)
//
//  - deposit: payment_status → "paid", deposit_paid_at set; a case still
//    in a pre-payment stage moves to "Documents Required", the next step
//    of the workflow. Works from "pending_review" (receipt uploaded),
//    "failed" (re-verified) or "unpaid" (transfer seen at the bank but no
//    receipt reached us).
//  - balance: balance_status → "paid", balance_paid_at set; the case is
//    then settled. Only after recovery completion made the balance due.
//
// Idempotent: the update is conditional on the installment not already
// being paid, so a repeated request, double click or second admin gets
// { alreadyPaid: true } and nothing is logged, messaged or emailed twice.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendCaseUpdateEmail } from "@/lib/email/case-update";
import { getAdminRole } from "@/lib/admin/auth";
import { paymentConfirmationUpdate } from "@/lib/portal/case-rules";
import { formatNaira } from "@/lib/portal/case-fees";
import {
  confirmableFrom,
  confirmationUpdate,
  isAlreadyConfirmed,
  PAYMENT_COLUMNS,
  pickPaymentRecord,
  summarizePayment,
  type PaymentKind,
} from "@/lib/portal/payments";
import type { CaseStage } from "@/lib/portal/mock-data";
import { postCaseMessage, recordStageChange } from "@/lib/server/case-events";
import { FORM_REQUEST_MESSAGE, RECOVERY_FORM_VERSION } from "@/lib/portal/recovery-form";

export async function POST(request: Request) {
  const role = await getAdminRole();
  if (!role || role.type !== "admin") {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  let body: { caseId?: unknown; kind?: unknown; reference?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const kind: PaymentKind = body.kind === "balance" ? "balance" : "deposit";
  // Optional bank-transfer reference typed by the admin when confirming.
  const reference = typeof body.reference === "string" ? body.reference.trim().slice(0, 120) || null : null;
  if (!caseId) {
    return NextResponse.json({ error: "missing_case_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: current, error: readError } = await admin
    .from("cases")
    .select(`id, title, user_id, agent_name, stage, cancelled_at, ${PAYMENT_COLUMNS}`)
    .eq("id", caseId)
    .maybeSingle();
  if (readError) {
    console.error("Failed to load case for payment confirmation:", readError);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  }

  const record = pickPaymentRecord(current);
  if (current.cancelled_at) {
    return NextResponse.json({ error: "case_cancelled", message: "This case has been cancelled." }, { status: 409 });
  }
  if (isAlreadyConfirmed(kind, record)) {
    return NextResponse.json({ ok: true, alreadyPaid: true, kind, payment: record, stage: current.stage });
  }
  const from = confirmableFrom(kind);
  const statusNow = kind === "deposit" ? record.payment_status : record.balance_status ?? "not_due";
  if (!from.includes(statusNow)) {
    // e.g. confirming a balance before recovery completion made it due.
    return NextResponse.json(
      { error: "not_confirmable", status: statusNow, message: `The ${kind} isn't due yet for this case.` },
      { status: 409 }
    );
  }

  const now = new Date();
  const update: Record<string, unknown> = { ...confirmationUpdate(kind, record, now) };
  if (kind === "deposit") {
    // Same stage rule as before: a confirmed deposit unlocks the next
    // workflow step, but never drags a case back.
    const next = paymentConfirmationUpdate({ stage: current.stage as CaseStage, payment_status: record.payment_status });
    if (next.update.stage) update.stage = next.update.stage;
  }

  const statusColumn = kind === "deposit" ? "payment_status" : "balance_status";
  const { data: updated, error } = await admin
    .from("cases")
    .update(update)
    .eq("id", caseId)
    .in(statusColumn, from)
    .select(`id, title, user_id, agent_name, stage, ${PAYMENT_COLUMNS}`)
    .maybeSingle();

  if (error) {
    console.error("Failed to confirm payment:", error);
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }
  if (!updated) {
    // Lost a race with another confirmation — nothing more to do.
    return NextResponse.json({ ok: true, alreadyPaid: true, kind, stage: current.stage });
  }

  const summary = summarizePayment(pickPaymentRecord(updated), now);
  const amount = kind === "deposit" ? summary.depositKobo : summary.balanceKobo;

  // Payment ledger: confirm the pending receipt row, or record a confirmed
  // transfer the admin verified without a receipt. The unique index on
  // (case_id, kind) where status = 'confirmed' backs up the conditional
  // case update above against double processing.
  const decidedBy = role.email;
  const { data: pendingRow } = await admin
    .from("payment_ledger")
    .select("id")
    .eq("case_id", caseId)
    .eq("kind", kind)
    .eq("status", "pending_review")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ledger = pendingRow
    ? await admin
        .from("payment_ledger")
        .update({ status: "confirmed", decided_at: now.toISOString(), decided_by: decidedBy, amount_kobo: amount, ...(reference ? { reference } : {}) })
        .eq("id", pendingRow.id)
    : await admin.from("payment_ledger").insert({
        case_id: caseId,
        user_id: updated.user_id,
        kind,
        amount_kobo: amount,
        status: "confirmed",
        reference,
        note: "Confirmed by admin without an uploaded receipt",
        submitted_at: now.toISOString(),
        decided_at: now.toISOString(),
        decided_by: decidedBy,
      });
  if (ledger.error) console.error("Payment confirmed but ledger write failed:", ledger.error, { caseId, kind });

  const { error: timelineError } = await admin.from("case_timeline_events").insert({
    case_id: caseId,
    event:
      kind === "deposit"
        ? `Deposit of ${formatNaira(amount)} confirmed — Payment Confirmed`
        : `Final balance of ${formatNaira(amount)} confirmed — paid in full`,
  });
  if (timelineError) console.error("Payment confirmed but timeline insert failed:", timelineError);
  if (update.stage) {
    // recordStageChange also writes the "Moved to …" timeline event.
    await recordStageChange(admin, {
      caseId,
      from: current.stage as CaseStage,
      to: update.stage as CaseStage,
      actor: { role: "system", name: "Deposit confirmed" },
    });
  }

  // Deposit: the exact "Payment confirmed!" message with the recovery form
  // under it (kind form_request), posted once. Balance: a thank-you note.
  await postCaseMessage(admin, {
    userId: updated.user_id,
    caseId,
    authorName: updated.agent_name || "Your agent",
    dedupeKey: `${kind}_confirmed:${caseId}`,
    kind: kind === "deposit" ? "form_request" : "system",
    metadata: kind === "deposit" ? { formVersion: RECOVERY_FORM_VERSION } : undefined,
    body:
      kind === "deposit"
        ? FORM_REQUEST_MESSAGE
        : `Your final balance of ${formatNaira(amount)} is confirmed — your case is now paid in full. Thank you!`,
  });

  const { data: clientData } = await admin.auth.admin.getUserById(updated.user_id);
  const clientEmail = clientData?.user?.email;
  if (clientEmail) {
    await sendCaseUpdateEmail({
      to: clientEmail,
      kind: "payment_confirmed",
      clientName: (clientData?.user?.user_metadata?.full_name as string | undefined) || "there",
      caseTitle: updated.title,
      agentName: updated.agent_name,
    });
  }

  return NextResponse.json({
    ok: true,
    alreadyPaid: false,
    kind,
    stage: updated.stage,
    payment: pickPaymentRecord(updated),
  });
}
