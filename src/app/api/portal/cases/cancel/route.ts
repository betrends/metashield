// Client cancels one of their own recovery cases. Records are never
// hard-deleted (payments, history and messages must be kept):
//  - No deposit paid or under review → the case is cancelled right away
//    (cancelled_at set; it disappears from active work for staff).
//  - Deposit paid or a receipt under review → a cancellation REQUEST is
//    sent to the team, who decide (the deposit is non-refundable per the
//    terms). The case stays active until the admin approves.
// Repeating the request is a no-op.

import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { postCaseMessage } from "@/lib/server/case-events";
import { sendStaffAlert } from "@/lib/email/staff-alert";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let body: { caseId?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!caseId) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  // RLS: only the client's own case is returned.
  const { data: ownCase } = await supabase
    .from("cases")
    .select("id, title, stage, payment_status, cancelled_at, cancellation_requested_at, agent_email, agent_name")
    .eq("id", caseId)
    .maybeSingle();
  if (!ownCase) return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  if (ownCase.cancelled_at) return NextResponse.json({ ok: true, outcome: "cancelled", unchanged: true });
  if (ownCase.stage === "Resolved") {
    return NextResponse.json({ error: "case_complete", message: "A completed case can't be cancelled." }, { status: 409 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const clientName = (user.user_metadata?.full_name as string | undefined) || user.email || "A client";
  const moneyInvolved = ownCase.payment_status === "paid" || ownCase.payment_status === "pending_review";

  if (!moneyInvolved) {
    const { data: cancelled, error } = await admin
      .from("cases")
      .update({ cancelled_at: now, cancelled_by: `client:${user.email ?? user.id}`, cancellation_reason: reason || null })
      .eq("id", caseId)
      .is("cancelled_at", null)
      .in("payment_status", ["unpaid", "failed"])
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("Case cancel failed:", error);
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
    if (cancelled) {
      await admin.from("case_timeline_events").insert({
        case_id: caseId,
        event: `Case cancelled by client${reason ? ` — ${reason}` : ""}`,
      });
      await sendStaffAlert({
        subject: `Case cancelled by client: ${ownCase.title}`,
        lines: [`${clientName} cancelled this case before paying.`, reason ? `Reason: ${reason}` : ""].filter(Boolean),
        link: `/admin/cases/${caseId}`,
        to: [ownCase.agent_email],
      });
      return NextResponse.json({ ok: true, outcome: "cancelled" });
    }
    // Payment status changed meanwhile — fall through to a request.
  }

  if (ownCase.cancellation_requested_at) return NextResponse.json({ ok: true, outcome: "requested", unchanged: true });
  const { error: reqError } = await admin
    .from("cases")
    .update({ cancellation_requested_at: now, cancellation_reason: reason || null })
    .eq("id", caseId)
    .is("cancellation_requested_at", null);
  if (reqError) {
    console.error("Cancellation request failed:", reqError);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  await admin.from("case_timeline_events").insert({ case_id: caseId, event: "Client requested cancellation" });
  await postCaseMessage(admin, {
    userId: user.id,
    caseId,
    authorName: ownCase.agent_name || "MetaShield",
    kind: "system",
    dedupeKey: `cancel_requested:${caseId}`,
    body: "We've received your cancellation request. Our team will review it and reply here. As stated in the terms, the deposit is non-refundable.",
  });
  await sendStaffAlert({
    subject: `Cancellation requested: ${ownCase.title}`,
    lines: [`${clientName} asked to cancel this case (deposit paid or under review).`, reason ? `Reason: ${reason}` : ""].filter(Boolean),
    link: `/admin/cases/${caseId}`,
    to: [ownCase.agent_email],
  });
  return NextResponse.json({ ok: true, outcome: "requested" });
}
