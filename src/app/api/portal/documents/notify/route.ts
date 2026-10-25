// Called by the client after a batch of documents has been uploaded and
// registered (/api/portal/documents/register). The server re-checks that
// every listed document exists and is linked to this client's case before:
//  - posting "Document upload received…" in the case chat (once per
//    batch, de-duplicated so a refresh or retry can't repeat it),
//  - moving a paid case from "Documents Required" to "Under Review" once
//    the recovery form is in and every required document type has been
//    submitted (submission is not approval — staff approve or reject each
//    document afterwards),
//  - emailing the team and the assigned agent.
// Auth-gated; only works on the caller's own case (checked through RLS).

import { createHash } from "node:crypto";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { documentsSubmittedEmail } from "@/lib/email-templates";
import { documentTypeLabel, readyForReview, type CaseDocument } from "@/lib/portal/workflow";
import type { CaseStage } from "@/lib/portal/mock-data";
import { moveStage, postCaseMessage } from "@/lib/server/case-events";

const DOCUMENTS_RECEIVED_MESSAGE =
  "Document upload received. Your documents have been submitted successfully and are awaiting review.";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { caseId?: unknown; documentIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const documentIds = Array.isArray(body.documentIds)
    ? body.documentIds.filter((n): n is string => typeof n === "string").slice(0, 50)
    : [];
  if (!caseId || documentIds.length === 0) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { data: ownCase } = await supabase
    .from("cases")
    .select("id, title, stage, payment_status, agent_name, agent_email, cancelled_at")
    .eq("id", caseId)
    .maybeSingle();
  if (!ownCase) return NextResponse.json({ error: "case_not_found" }, { status: 404 });

  const admin = createAdminClient();
  const { data: caseDocs, error: docsError } = await admin
    .from("documents")
    .select("id, name, category, review_status, user_id")
    .eq("case_id", caseId);
  if (docsError) {
    console.error("Documents notify: lookup failed:", docsError);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }
  const docs = (caseDocs ?? []) as (CaseDocument & { id: string; name: string; user_id: string })[];
  const batch = docs.filter((d) => documentIds.includes(d.id) && d.user_id === user.id);
  if (batch.length !== documentIds.length) {
    // Something in the list isn't stored or isn't linked to this case.
    return NextResponse.json({ error: "documents_not_found" }, { status: 400 });
  }

  const batchKey = createHash("sha256").update([...documentIds].sort().join(",")).digest("hex").slice(0, 32);
  const posted = await postCaseMessage(admin, {
    userId: user.id,
    caseId,
    authorName: ownCase.agent_name || "MetaShield",
    kind: "system",
    dedupeKey: `docs_received:${caseId}:${batchKey}`,
    body: DOCUMENTS_RECEIVED_MESSAGE,
  });
  if (!posted) {
    // Already handled (refresh/retry) — don't move or email again.
    return NextResponse.json({ ok: true, alreadyNotified: true, stage: ownCase.stage });
  }

  await admin.from("case_timeline_events").insert({
    case_id: caseId,
    event: `${batch.length} document${batch.length !== 1 ? "s" : ""} submitted by client: ${batch
      .map((d) => documentTypeLabel(d.category))
      .join(", ")}`,
  });

  let stage = ownCase.stage as CaseStage;
  const { count: formCount } = await admin
    .from("recovery_form_submissions")
    .select("id", { count: "exact", head: true })
    .eq("case_id", caseId);
  if (
    !ownCase.cancelled_at &&
    readyForReview({ stage, depositConfirmed: ownCase.payment_status === "paid", formSubmitted: (formCount ?? 0) > 0, docs })
  ) {
    const moved = await moveStage(admin, {
      caseId,
      from: "Documents Required",
      to: "Under Review",
      actor: { role: "system", name: "Required documents submitted" },
    });
    if (moved) stage = "Under Review";
  }

  const recipients = Array.from(
    new Set([process.env.NOTIFY_EMAIL, ownCase.agent_email].filter((e): e is string => !!e))
  );
  if (process.env.RESEND_API_KEY && recipients.length > 0) {
    const clientEmail = user.email ?? "";
    const clientName = (user.user_metadata?.full_name as string | undefined) || clientEmail.split("@")[0] || "A client";
    try {
      const { error: sendError } = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.RESEND_FROM_EMAIL || "MetaShield <onboarding@resend.dev>",
        to: recipients,
        replyTo: clientEmail || undefined,
        subject: `📎 ${batch.length} document${batch.length !== 1 ? "s" : ""} submitted by ${clientName}`.replace(/[\r\n]+/g, " "),
        html: documentsSubmittedEmail({
          clientName,
          clientEmail,
          fileCount: batch.length,
          fileNames: batch.map((d) => `${documentTypeLabel(d.category)}: ${d.name}`),
          caseTitle: ownCase.title,
        }),
      });
      if (sendError) console.error("Resend rejected document notification:", sendError);
    } catch (err) {
      console.error("Failed to send document notification:", err);
    }
  }

  return NextResponse.json({ ok: true, stage });
}
