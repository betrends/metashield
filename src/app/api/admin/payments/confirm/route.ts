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

export async function POST(request: Request) {
  const role = await getAdminRole();
  if (!role || role.type !== "admin") {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  let body: { caseId?: unknown; kind?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const kind: PaymentKind = body.kind === "balance" ? "balance" : "deposit";
  if (!caseId) {
    return NextResponse.json({ error: "missing_case_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: current, error: readError } = await admin
    .from("cases")
    .select(`id, title, user_id, agent_name, stage, ${PAYMENT_COLUMNS}`)
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

  const events =
    kind === "deposit"
      ? [`Deposit of ${formatNaira(amount)} confirmed — Payment Confirmed`]
      : [`Final balance of ${formatNaira(amount)} confirmed — paid in full`];
  if (update.stage) events.push(`Moved to ${update.stage}`);
  const { error: timelineError } = await admin
    .from("case_timeline_events")
    .insert(events.map((event) => ({ case_id: caseId, event })));
  if (timelineError) console.error("Payment confirmed but timeline insert failed:", timelineError);

  const { error: messageError } = await admin.from("messages").insert({
    user_id: updated.user_id,
    case_id: caseId,
    from_role: "team",
    author_name: updated.agent_name || "Your agent",
    body:
      kind === "balance"
        ? `Your final balance of ${formatNaira(amount)} is confirmed — your case is now paid in full. Thank you!`
        : updated.stage === "Documents Required"
          ? `Your deposit of ${formatNaira(amount)} is confirmed, thank you! Next step: please upload your supporting documents (ID, screenshots, any emails from the platform) in the Document Center so I can start the recovery. The remaining ${formatNaira(
              summary.balanceKobo
            )} is only due after your recovery is completed.`
          : `Your deposit of ${formatNaira(amount)} is confirmed, thank you! I'll keep you posted here as the recovery progresses.`,
  });
  if (messageError) console.error("Payment confirmed but message insert failed:", messageError);

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
