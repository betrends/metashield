// Recovery workflow rules: the valid stage transitions, the documents a
// case needs, upload limits, and the "next action" shown to each side.
// Pure (no Supabase/Next imports) so it is unit-testable and the same
// rules run in the browser and on the server.

import type { CaseStage } from "@/lib/portal/mock-data";

// ── Documents ──────────────────────────────────────────────────────────
// From the Document Center ("Government ID, business registration,
// screenshots and platform emails") and MetaShield's recovery form, whose
// only required upload is a screenshot of the account at login.
export type DocumentType = "government_id" | "error_screenshot" | "platform_email" | "business_registration" | "other";

export const DOCUMENT_TYPES: { value: DocumentType; label: string; required: boolean; hint: string }[] = [
  { value: "error_screenshot", label: "Screenshot of your account when you log in", required: true, hint: "The screen you see when you try to log in, e.g. the disabled or suspended notice" },
  { value: "government_id", label: "Government-issued ID", required: false, hint: "Passport, driver's licence, national ID or voter's card" },
  { value: "platform_email", label: "Emails from the platform", required: false, hint: "Any email Meta or the platform sent you about this" },
  { value: "business_registration", label: "Business registration", required: false, hint: "Only for business pages and ad accounts" },
  { value: "other", label: "Other supporting document", required: false, hint: "Anything else that helps your case" },
];

export const REQUIRED_DOCUMENT_TYPES = DOCUMENT_TYPES.filter((d) => d.required).map((d) => d.value);

export function documentTypeLabel(value: string): string {
  return DOCUMENT_TYPES.find((d) => d.value === value)?.label ?? value;
}

// Accepted formats ("PDF, image or screenshot") and size, enforced on the
// server against the stored object, not only in the browser.
export const ACCEPTED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WEBP",
  "image/heic": "HEIC",
  "image/heif": "HEIF",
};
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const ACCEPT_ATTRIBUTE = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif";

export function validateDocumentFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_MIME_TYPES[file.type]) return "Only PDF, JPG, PNG, WEBP or HEIC files are accepted.";
  if (file.size <= 0) return "That file is empty.";
  if (file.size > MAX_DOCUMENT_BYTES) return "Files must be 10 MB or smaller.";
  return null;
}

export type ReviewStatus = "submitted" | "approved" | "rejected";
export type CaseDocument = { category: string; review_status: ReviewStatus };

// Every required type has at least one document that hasn't been rejected.
export function documentsSubmitted(docs: CaseDocument[]): boolean {
  return REQUIRED_DOCUMENT_TYPES.every((t) => docs.some((d) => d.category === t && d.review_status !== "rejected"));
}

// Every required type has an approved document and nothing is still
// waiting for review.
export function documentsApproved(docs: CaseDocument[]): boolean {
  return (
    REQUIRED_DOCUMENT_TYPES.every((t) => docs.some((d) => d.category === t && d.review_status === "approved")) &&
    !docs.some((d) => d.review_status === "submitted")
  );
}

export function missingDocumentTypes(docs: CaseDocument[]): DocumentType[] {
  return REQUIRED_DOCUMENT_TYPES.filter((t) => !docs.some((d) => d.category === t && d.review_status !== "rejected"));
}

// ── Stages ─────────────────────────────────────────────────────────────
// Normal (non-correction) moves. Anything else needs an admin correction
// with a reason, recorded in the stage history.
const TRANSITIONS: Record<CaseStage, CaseStage[]> = {
  "New Lead": ["Assessment Pending", "Payment Pending"],
  "Assessment Pending": ["Payment Pending"],
  "Payment Pending": ["Documents Required"],
  "Documents Required": ["Under Review"],
  "Under Review": ["Recovery Process", "Documents Required"],
  "Recovery Process": ["Awaiting Platform Response", "Resolved"],
  "Awaiting Platform Response": ["Recovery Process", "Resolved"],
  Resolved: [],
};

export function allowedNextStages(stage: CaseStage): CaseStage[] {
  return TRANSITIONS[stage] ?? [];
}

export function isAllowedTransition(from: CaseStage, to: CaseStage): boolean {
  return allowedNextStages(from).includes(to);
}

// ── Next action ────────────────────────────────────────────────────────
export function nextAction(input: {
  stage: CaseStage;
  depositConfirmed: boolean;
  depositStatus: string;
  balanceStatus: string;
  cancelled: boolean;
  cancellationRequested: boolean;
  docs: CaseDocument[];
  formSubmitted: boolean;
}): { client: string; staff: string } {
  const { stage, depositConfirmed, depositStatus, balanceStatus, docs } = input;
  if (input.cancelled) return { client: "This case has been cancelled.", staff: "Cancelled — no action needed." };
  if (input.cancellationRequested)
    return { client: "Your cancellation request is with our team.", staff: "Review the client's cancellation request." };
  if (!depositConfirmed) {
    if (depositStatus === "pending_review")
      return { client: "We're verifying your deposit.", staff: "Verify the deposit receipt against the bank account." };
    return { client: "Pay the 50% deposit and upload your receipt.", staff: "Waiting for the client's deposit." };
  }
  if (stage === "Documents Required") {
    const missing = missingDocumentTypes(docs);
    if (!input.formSubmitted || missing.length) {
      const todo = [!input.formSubmitted ? "fill out the recovery form" : null, ...missing.map((m) => `upload ${documentTypeLabel(m).toLowerCase()}`)]
        .filter(Boolean)
        .join(" and ");
      return { client: `Please ${todo}.`, staff: "Waiting for the client's recovery form and documents." };
    }
    return { client: "Form and documents received.", staff: "Form and documents received — case will move to review." };
  }
  if (stage === "Under Review") {
    return docs.some((d) => d.review_status === "submitted")
      ? { client: "Your documents are being reviewed.", staff: "Review the submitted documents." }
      : { client: "Your documents are being reviewed.", staff: "Approve or reject the documents to continue." };
  }
  if (stage === "Recovery Process") return { client: "Your agent is working on the recovery.", staff: "Work the recovery; move to Awaiting Platform Response when submitted." };
  if (stage === "Awaiting Platform Response") return { client: "Waiting for the platform's response.", staff: "Follow up with the platform." };
  if (stage === "Resolved") {
    if (balanceStatus === "due" || balanceStatus === "failed")
      return { client: "Pay the remaining 50% balance and upload your receipt.", staff: "Waiting for the final balance." };
    if (balanceStatus === "pending_review")
      return { client: "We're verifying your final payment.", staff: "Verify the final balance receipt." };
    return { client: "Your case is complete.", staff: "Complete." };
  }
  return { client: "Our team is reviewing your case.", staff: "Review the case." };
}

// A paid case waiting on the client moves to review once the recovery
// form is submitted and every required document type has been submitted.
export function readyForReview(input: { stage: CaseStage; depositConfirmed: boolean; formSubmitted: boolean; docs: CaseDocument[] }): boolean {
  return input.stage === "Documents Required" && input.depositConfirmed && input.formSubmitted && documentsSubmitted(input.docs);
}
