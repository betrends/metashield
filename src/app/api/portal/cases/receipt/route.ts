// Records a bank-transfer receipt the signed-in client has just uploaded
// to their own Storage folder ("documents" bucket, "<user-id>/receipts/…").
// This used to be a direct browser update of the cases row — which meant
// the browser could also set payment_status to "paid". Now the server
// only ever moves an unpaid/failed case to "pending_review".

import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { sendCaseUpdateEmail } from "@/lib/email/case-update";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: { caseId?: unknown; storagePath?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const storagePath = typeof body.storagePath === "string" ? body.storagePath : "";
  if (!caseId || !storagePath.startsWith(`${user.id}/receipts/`) || storagePath.includes("..")) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Read through the client's own session: RLS only returns their case.
  const { data: ownCase } = await supabase
    .from("cases")
    .select("id, title, payment_status, fee_amount_kobo")
    .eq("id", caseId)
    .maybeSingle();
  if (!ownCase) {
    return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  }
  if (ownCase.payment_status === "paid") {
    return NextResponse.json({ error: "already_paid" }, { status: 409 });
  }

  const admin = createAdminClient();
  // Conditional: never downgrade a case that became "paid" meanwhile.
  const { data: updated, error } = await admin
    .from("cases")
    .update({ payment_status: "pending_review", receipt_storage_path: storagePath })
    .eq("id", caseId)
    .in("payment_status", ["unpaid", "failed", "pending_review"])
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Failed to record receipt:", error);
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "already_paid" }, { status: 409 });
  }

  await admin.from("case_timeline_events").insert({
    case_id: caseId,
    event: "Payment receipt submitted — awaiting confirmation",
  });

  // (The team notification is sent by the browser through /api/notify
  // after this succeeds, as before.)
  if (user.email) {
    await sendCaseUpdateEmail({
      to: user.email,
      kind: "receipt_received",
      clientName: (user.user_metadata?.full_name as string | undefined) || "there",
      caseTitle: ownCase.title,
    });
  }

  return NextResponse.json({ ok: true, title: ownCase.title, feeAmountKobo: ownCase.fee_amount_kobo });
}
