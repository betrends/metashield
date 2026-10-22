// Admin marks a case's bank-transfer payment as confirmed: advances the
// case, logs it, and lets the client know. Gated to ADMIN_EMAIL.
//
// Works for "pending_review" (receipt uploaded) and "unpaid" (client paid
// but no receipt reached us — the admin has checked the bank account).
// Idempotent: confirming an already-paid case returns ok without logging
// or messaging twice, and a case already past "Documents Required" keeps
// its stage.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendCaseUpdateEmail } from "@/lib/email/case-update";
import { getAdminRole } from "@/lib/admin/auth";
import { paymentConfirmationUpdate, type PaymentStatus } from "@/lib/portal/case-rules";
import type { CaseStage } from "@/lib/portal/mock-data";

export async function POST(request: Request) {
  const role = await getAdminRole();
  if (!role || role.type !== "admin") {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  let body: { caseId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  if (!caseId) {
    return NextResponse.json({ error: "missing_case_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: current, error: readError } = await admin
    .from("cases")
    .select("id, title, user_id, agent_name, stage, payment_status")
    .eq("id", caseId)
    .maybeSingle();
  if (readError) {
    console.error("Failed to load case for payment confirmation:", readError);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  }

  const { alreadyPaid, update } = paymentConfirmationUpdate({
    stage: current.stage as CaseStage,
    payment_status: current.payment_status as PaymentStatus,
  });
  if (alreadyPaid) {
    return NextResponse.json({ ok: true, alreadyPaid: true, stage: current.stage, paymentStatus: "paid" });
  }

  // Only flips a case that is still unpaid, so two admins clicking at
  // once can't both log the confirmation.
  const { data: updatedCase, error } = await admin
    .from("cases")
    .update(update)
    .eq("id", caseId)
    .neq("payment_status", "paid")
    .select("id, title, user_id, agent_name, stage, payment_status")
    .maybeSingle();

  if (error) {
    console.error("Failed to confirm payment:", error);
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }
  if (!updatedCase) {
    return NextResponse.json({ ok: true, alreadyPaid: true, stage: current.stage, paymentStatus: "paid" });
  }

  const nextStepEvents = [{ case_id: caseId, event: "Payment confirmed — recovery started" }];
  if (update.stage) nextStepEvents.push({ case_id: caseId, event: `Moved to ${update.stage}` });
  const { error: timelineError } = await admin.from("case_timeline_events").insert(nextStepEvents);
  if (timelineError) console.error("Payment confirmed but timeline insert failed:", timelineError);

  const { error: messageError } = await admin.from("messages").insert({
    user_id: updatedCase.user_id,
    case_id: caseId,
    from_role: "team",
    author_name: updatedCase.agent_name || "Your agent",
    body:
      updatedCase.stage === "Documents Required"
        ? "Payment received and confirmed, thank you! Next step: please upload your supporting documents (ID, screenshots, any emails from the platform) in the Document Center so I can start the recovery."
        : "Payment received and confirmed, thank you! I'll keep you posted here as the recovery progresses.",
  });
  if (messageError) console.error("Payment confirmed but message insert failed:", messageError);

  const { data: clientData } = await admin.auth.admin.getUserById(updatedCase.user_id);
  const clientEmail = clientData?.user?.email;
  if (clientEmail) {
    await sendCaseUpdateEmail({
      to: clientEmail,
      kind: "payment_confirmed",
      clientName: (clientData?.user?.user_metadata?.full_name as string | undefined) || "there",
      caseTitle: updatedCase.title,
      agentName: updatedCase.agent_name,
    });
  }

  return NextResponse.json({
    ok: true,
    alreadyPaid: false,
    stage: updatedCase.stage,
    paymentStatus: updatedCase.payment_status,
  });
}
