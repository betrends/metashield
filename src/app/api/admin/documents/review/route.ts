// Staff approve or reject one client document. The admin may review any
// document; an agent only documents on cases assigned to them.
//
//  - approve: when every required document type has an approved document
//    and nothing is waiting for review, an "Under Review" case moves on
//    to "Recovery Process" automatically (recorded as a system step).
//  - reject (with a note for the client): the client is told what to fix;
//    if a required type no longer has a usable document, an "Under
//    Review" case goes back to "Documents Required".
// Re-deciding a document with the same decision is a no-op.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { canAccessCase, getAdminRole } from "@/lib/admin/auth";
import {
  documentsApproved,
  documentsSubmitted,
  documentTypeLabel,
  type CaseDocument,
} from "@/lib/portal/workflow";
import type { CaseStage } from "@/lib/portal/mock-data";
import { moveStage, postCaseMessage } from "@/lib/server/case-events";

export async function POST(request: Request) {
  const role = await getAdminRole();
  if (!role) return NextResponse.json({ error: "not_authorized" }, { status: 403 });

  let body: { documentId?: unknown; decision?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const documentId = typeof body.documentId === "string" ? body.documentId : "";
  const decision = body.decision === "approve" ? "approved" : body.decision === "reject" ? "rejected" : null;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (!documentId || !decision) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  if (decision === "rejected" && note.length < 3) {
    return NextResponse.json({ error: "note_required", message: "Tell the client what's wrong with the document." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("documents")
    .select("id, case_id, user_id, name, category, review_status")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc || !doc.case_id) return NextResponse.json({ error: "document_not_found" }, { status: 404 });
  if (!(await canAccessCase(role, doc.case_id))) return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  if (doc.review_status === decision) return NextResponse.json({ ok: true, unchanged: true });

  const reviewer = role.type === "agent" ? role.agentName : role.email;
  const { error } = await admin
    .from("documents")
    .update({ review_status: decision, reviewed_at: new Date().toISOString(), reviewed_by: reviewer, review_note: note || null })
    .eq("id", documentId);
  if (error) {
    console.error("Document review failed:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  const { data: kase } = await admin
    .from("cases")
    .select("id, stage, agent_name, cancelled_at")
    .eq("id", doc.case_id)
    .maybeSingle();
  const { data: allDocs } = await admin.from("documents").select("category, review_status").eq("case_id", doc.case_id);
  const docs = (allDocs ?? []) as CaseDocument[];
  const label = documentTypeLabel(doc.category);

  await admin.from("case_timeline_events").insert({
    case_id: doc.case_id,
    event: `${label} ${decision === "approved" ? "approved" : "rejected"} by ${reviewer}`,
  });

  let stage = (kase?.stage ?? null) as CaseStage | null;
  if (kase && !kase.cancelled_at && stage === "Under Review") {
    if (decision === "approved" && documentsApproved(docs)) {
      if (
        await moveStage(admin, {
          caseId: doc.case_id,
          from: "Under Review",
          to: "Recovery Process",
          actor: { role: "system", name: "All required documents approved" },
        })
      )
        stage = "Recovery Process";
    } else if (decision === "rejected" && !documentsSubmitted(docs)) {
      if (
        await moveStage(admin, {
          caseId: doc.case_id,
          from: "Under Review",
          to: "Documents Required",
          actor: { role: "system", name: "Required document rejected" },
        })
      )
        stage = "Documents Required";
    }
  }

  await postCaseMessage(admin, {
    userId: doc.user_id,
    caseId: doc.case_id,
    authorName: kase?.agent_name || "Your agent",
    kind: "system",
    dedupeKey: `doc_review:${documentId}:${decision}:${Date.now()}`,
    body:
      decision === "approved"
        ? stage === "Recovery Process"
          ? `Your documents have been approved and your recovery is now in progress.`
          : `Your ${label} has been approved.`
        : `Your ${label} (${doc.name}) couldn't be accepted: ${note}. Please upload a new one from your case page.`,
  });

  return NextResponse.json({ ok: true, decision, stage });
}
