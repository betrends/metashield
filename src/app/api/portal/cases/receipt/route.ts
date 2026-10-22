// Records a bank-transfer receipt the signed-in client has just uploaded
// to their own Storage folder ("documents" bucket, "<user-id>/receipts/…"),
// for either installment:
//   kind "deposit" — the 50% deposit (default, matches older callers)
//   kind "balance" — the remaining 50%, due after recovery completes
//
// Submitting a receipt never marks anything paid: it moves that
// installment to "pending_review" until an admin verifies the transfer
// at the bank (/api/admin/payments/confirm). A receipt is refused while
// one is already under review or the installment is paid, so refreshing
// or retrying can't produce a second payment.

import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { sendCaseUpdateEmail } from "@/lib/email/case-update";
import { formatNaira } from "@/lib/portal/case-fees";
import {
  canSubmitReceipt,
  PAYMENT_COLUMNS,
  pickPaymentRecord,
  summarizePayment,
  type PaymentKind,
} from "@/lib/portal/payments";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: { caseId?: unknown; storagePath?: unknown; kind?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const storagePath = typeof body.storagePath === "string" ? body.storagePath : "";
  const kind: PaymentKind = body.kind === "balance" ? "balance" : "deposit";
  if (!caseId || !storagePath.startsWith(`${user.id}/receipts/`) || storagePath.includes("..")) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Read through the client's own session: RLS only returns their case.
  const { data: ownCase } = await supabase
    .from("cases")
    .select(`id, title, ${PAYMENT_COLUMNS}`)
    .eq("id", caseId)
    .maybeSingle();
  if (!ownCase) {
    return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  }
  const record = pickPaymentRecord(ownCase);
  if (!canSubmitReceipt(kind, record)) {
    return NextResponse.json({ error: "not_payable", ...statusFor(kind, record) }, { status: 409 });
  }

  const admin = createAdminClient();
  // Conditional on the status we just checked, so two concurrent
  // submissions (double click, two tabs) can't both go through.
  const update =
    kind === "deposit"
      ? admin
          .from("cases")
          .update({ payment_status: "pending_review", receipt_storage_path: storagePath })
          .eq("id", caseId)
          .in("payment_status", ["unpaid", "failed"])
      : admin
          .from("cases")
          .update({ balance_status: "pending_review", balance_receipt_storage_path: storagePath })
          .eq("id", caseId)
          .eq("payment_status", "paid")
          .in("balance_status", ["due", "failed"]);
  const { data: updated, error } = await update.select("id").maybeSingle();
  if (error) {
    console.error("Failed to record receipt:", error);
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "not_payable" }, { status: 409 });
  }

  const summary = summarizePayment(record);
  const amount = kind === "deposit" ? summary.depositKobo : summary.balanceKobo;
  await admin.from("case_timeline_events").insert({
    case_id: caseId,
    event:
      kind === "deposit"
        ? `Deposit receipt (${formatNaira(amount)}) submitted — awaiting verification`
        : `Final balance receipt (${formatNaira(amount)}) submitted — awaiting verification`,
  });

  if (user.email) {
    await sendCaseUpdateEmail({
      to: user.email,
      kind: "receipt_received",
      clientName: (user.user_metadata?.full_name as string | undefined) || "there",
      caseTitle: ownCase.title,
    });
  }

  // (The team notification is sent by the browser through /api/notify
  // after this succeeds, as before.)
  return NextResponse.json({ ok: true, kind, title: ownCase.title, amountKobo: amount });
}

function statusFor(kind: PaymentKind, r: ReturnType<typeof pickPaymentRecord>) {
  return kind === "deposit" ? { status: r.payment_status } : { status: r.balance_status ?? "not_due" };
}
