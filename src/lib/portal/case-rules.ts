// Pure rules for the recovery-case lifecycle, shared by the client data
// layer and the admin/agent API routes. Kept free of Supabase/Next imports
// so it can be unit-tested on its own (see scripts/test-case-rules.mjs).

import type { CaseStage } from "@/lib/portal/mock-data";

export type PaymentStatus = "unpaid" | "pending_review" | "paid" | "failed";

// Stages a case can be in before its fee has been confirmed.
export const PRE_PAYMENT_STAGES: CaseStage[] = ["New Lead", "Assessment Pending", "Payment Pending"];

// Moving a case into any later stage while it is unpaid is what produced
// cases that were "in progress" for staff but still showed "Payment
// required" to the client. Staff must confirm payment first.
export function stageRequiresPayment(stage: CaseStage): boolean {
  return !PRE_PAYMENT_STAGES.includes(stage);
}

export function canMoveToStage(
  stage: CaseStage,
  paymentStatus: PaymentStatus
): { ok: true } | { ok: false; reason: "payment_not_confirmed" } {
  if (stageRequiresPayment(stage) && paymentStatus !== "paid") {
    return { ok: false, reason: "payment_not_confirmed" };
  }
  return { ok: true };
}

// What confirming a payment should do to a case. Idempotent: confirming
// an already-paid case changes nothing, and a case that staff had already
// moved past "Documents Required" is not dragged back to it.
export function paymentConfirmationUpdate(current: {
  stage: CaseStage;
  payment_status: PaymentStatus;
}): { alreadyPaid: boolean; update: { payment_status: "paid"; stage?: CaseStage } } {
  if (current.payment_status === "paid") {
    return { alreadyPaid: true, update: { payment_status: "paid" } };
  }
  return {
    alreadyPaid: false,
    update: PRE_PAYMENT_STAGES.includes(current.stage)
      ? { payment_status: "paid", stage: "Documents Required" }
      : { payment_status: "paid" },
  };
}

// After a client submits documents, a paid case waiting on documents moves
// on to review automatically, so it can no longer sit at "Documents
// Required" with nobody noticing the upload.
export function stageAfterDocumentsSubmitted(current: {
  stage: CaseStage;
  payment_status: PaymentStatus;
}): CaseStage | null {
  if (current.stage === "Documents Required" && current.payment_status === "paid") {
    return "Under Review";
  }
  return null;
}

// Which of a client's cases an upload or message belongs to when the page
// didn't say explicitly: the newest case that is still open. Input must be
// ordered newest first (as fetchCases returns it).
export function pickDefaultCaseId(
  cases: { id: string; stage: CaseStage }[],
  preferStage?: CaseStage
): string | null {
  if (preferStage) {
    const preferred = cases.find((c) => c.stage === preferStage);
    if (preferred) return preferred.id;
  }
  const open = cases.find((c) => c.stage !== "Resolved");
  return open?.id ?? null;
}

// Storage object names can't safely hold arbitrary user file names
// (slashes would create sub-folders and break the "<user-id>/…" storage
// policy check). The display name is stored separately.
export function safeStorageName(fileName: string): string {
  const cleaned = fileName.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+/, "");
  return (cleaned || "file").slice(-120);
}
