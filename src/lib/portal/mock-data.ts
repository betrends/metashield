// Shared constants for the client portal. The seed data that used to live
// here (sample accounts/cases/messages/documents) has been replaced by
// real per-user data from Supabase — see lib/portal/data.ts. What's left
// is genuinely just shared vocabulary, not demo content.

export type CaseStage =
  | "New Lead"
  | "Assessment Pending"
  | "Payment Pending"
  | "Documents Required"
  | "Under Review"
  | "Recovery Process"
  | "Awaiting Platform Response"
  | "Resolved";

export const caseStages: CaseStage[] = [
  "New Lead",
  "Assessment Pending",
  "Payment Pending",
  "Documents Required",
  "Under Review",
  "Recovery Process",
  "Awaiting Platform Response",
  "Resolved",
];
