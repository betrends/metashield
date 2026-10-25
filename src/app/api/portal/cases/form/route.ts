// Saves the recovery form for one of the signed-in client's cases.
//  - Only after the deposit is confirmed (the form isn't offered before).
//  - Answers are validated on the server (lib/portal/recovery-form.ts).
//  - The account screenshot must already be uploaded to the case.
//  - One submission per case: a repeat returns the saved one.
// Once the form and required documents are in, a "Documents Required"
// case moves to "Under Review" (recorded as a system step).

import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { RECOVERY_FORM_VERSION, validateRecoveryForm } from "@/lib/portal/recovery-form";
import { documentsSubmitted, readyForReview, type CaseDocument } from "@/lib/portal/workflow";
import type { CaseStage } from "@/lib/portal/mock-data";
import { moveStage, postCaseMessage } from "@/lib/server/case-events";
import { sendStaffAlert } from "@/lib/email/staff-alert";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let body: { caseId?: unknown; answers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  if (!caseId) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const { data: ownCase } = await supabase
    .from("cases")
    .select("id, title, stage, payment_status, cancelled_at, agent_name, agent_email")
    .eq("id", caseId)
    .maybeSingle();
  if (!ownCase) return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  if (ownCase.cancelled_at) return NextResponse.json({ error: "case_cancelled" }, { status: 409 });
  if (ownCase.payment_status !== "paid") {
    return NextResponse.json({ error: "deposit_not_confirmed", message: "The form opens once your deposit is confirmed." }, { status: 409 });
  }

  const validation = validateRecoveryForm(body.answers);
  if (!validation.ok) return NextResponse.json({ error: "invalid_answers", errors: validation.errors }, { status: 400 });

  const admin = createAdminClient();
  const { data: caseDocs } = await admin.from("documents").select("category, review_status").eq("case_id", caseId);
  const docs = (caseDocs ?? []) as CaseDocument[];
  if (!documentsSubmitted(docs)) {
    return NextResponse.json(
      { error: "screenshot_missing", message: "Please upload a screenshot of your account when you log in." },
      { status: 400 }
    );
  }

  const { data: saved, error } = await admin
    .from("recovery_form_submissions")
    .upsert(
      { case_id: caseId, user_id: user.id, form_version: RECOVERY_FORM_VERSION, answers: validation.answers },
      { onConflict: "case_id", ignoreDuplicates: true }
    )
    .select("submitted_at")
    .maybeSingle();
  if (error) {
    console.error("Recovery form save failed:", error);
    return NextResponse.json({ error: "save_failed", message: "Couldn't save the form — please try again." }, { status: 500 });
  }
  if (!saved) {
    // Already submitted (double click / refresh): nothing more to do.
    return NextResponse.json({ ok: true, alreadySubmitted: true, stage: ownCase.stage });
  }

  await admin.from("case_timeline_events").insert({ case_id: caseId, event: "Recovery form submitted by client" });
  await postCaseMessage(admin, {
    userId: user.id,
    caseId,
    authorName: ownCase.agent_name || "MetaShield",
    kind: "system",
    dedupeKey: `form_received:${caseId}`,
    body: "Thank you — your recovery form has been received.",
  });

  let stage = ownCase.stage as CaseStage;
  if (readyForReview({ stage, depositConfirmed: true, formSubmitted: true, docs })) {
    if (
      await moveStage(admin, {
        caseId,
        from: "Documents Required",
        to: "Under Review",
        actor: { role: "system", name: "Recovery form and documents submitted" },
      })
    )
      stage = "Under Review";
  }

  await sendStaffAlert({
    subject: `Recovery form submitted: ${ownCase.title}`,
    lines: [
      `${validation.answers.full_name} (@${validation.answers.instagram_username}) submitted the recovery form.`,
      stage === "Under Review" ? "The case is now Under Review — please review the documents." : "Waiting for remaining documents.",
    ],
    link: `/admin/cases/${caseId}`,
    to: [ownCase.agent_email],
  });

  return NextResponse.json({ ok: true, stage });
}
