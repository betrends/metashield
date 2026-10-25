// Admin rejects a submitted receipt that doesn't match a transfer in the
// bank account. The installment becomes "failed" (shown to the client as
// "not verified"), the case does NOT advance, and the client is asked to
// check and re-upload. Gated to ADMIN_EMAIL.
//
// Body: { caseId, kind?: "deposit" | "balance", reason?: string }
// Only a receipt that is under review can be rejected; repeating the
// request is a no-op ({ alreadyRejected: true }).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminRole } from "@/lib/admin/auth";
import type { PaymentKind } from "@/lib/portal/payments";
import { postCaseMessage } from "@/lib/server/case-events";

export async function POST(request: Request) {
  const role = await getAdminRole();
  if (!role || role.type !== "admin") {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  let body: { caseId?: unknown; kind?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const kind: PaymentKind = body.kind === "balance" ? "balance" : "deposit";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
  if (!caseId) {
    return NextResponse.json({ error: "missing_case_id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const statusColumn = kind === "deposit" ? "payment_status" : "balance_status";
  const { data: updated, error } = await admin
    .from("cases")
    .update({ [statusColumn]: "failed" })
    .eq("id", caseId)
    .eq(statusColumn, "pending_review")
    .select("id, user_id, agent_name")
    .maybeSingle();
  if (error) {
    console.error("Failed to reject receipt:", error);
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }
  if (!updated) {
    const { data: exists } = await admin.from("cases").select(statusColumn).eq("id", caseId).maybeSingle();
    if (!exists) return NextResponse.json({ error: "case_not_found" }, { status: 404 });
    const status = (exists as Record<string, string>)[statusColumn];
    return status === "failed"
      ? NextResponse.json({ ok: true, alreadyRejected: true })
      : NextResponse.json({ error: "nothing_to_reject", status }, { status: 409 });
  }

  const label = kind === "deposit" ? "deposit" : "final balance";
  const { data: pendingRow } = await admin
    .from("payment_ledger")
    .select("id")
    .eq("case_id", caseId)
    .eq("kind", kind)
    .eq("status", "pending_review")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pendingRow) {
    const { error: ledgerError } = await admin
      .from("payment_ledger")
      .update({ status: "rejected", decided_at: new Date().toISOString(), decided_by: role.email, note: reason || null })
      .eq("id", pendingRow.id);
    if (ledgerError) console.error("Receipt rejected but ledger write failed:", ledgerError, { caseId, kind });
  }
  await admin.from("case_timeline_events").insert({
    case_id: caseId,
    event: `${kind === "deposit" ? "Deposit" : "Final balance"} receipt could not be verified`,
  });
  await postCaseMessage(admin, {
    userId: updated.user_id,
    caseId,
    authorName: updated.agent_name || "Your agent",
    dedupeKey: pendingRow ? `${kind}_rejected:${pendingRow.id}` : undefined,
    body: `We couldn't match your ${label} receipt to a transfer in our account${
      reason ? ` (${reason})` : ""
    }. Please check the transfer details and upload the correct receipt from your case page — nothing else on your case has changed.`,
  });

  return NextResponse.json({ ok: true, kind });
}
