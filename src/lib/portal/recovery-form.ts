// The recovery form sent in the case chat once the deposit is confirmed.
// Questions supplied by MetaShield on 2026-10-25 (Facebook questions
// removed at their request). The account screenshot (question 1) is
// uploaded as a case document of type "error_screenshot"; the rest are
// saved in recovery_form_submissions.answers.
//
// Pure: validation runs in the browser and again on the server.

export const RECOVERY_FORM_VERSION = "v1-2026-10-25";

export const FORM_REQUEST_MESSAGE = "Payment confirmed! Please fill out the recovery form below to proceed with your case.";

export type RecoveryFormAnswers = {
  full_name: string;
  instagram_username: string;
  instagram_phone: string;
  instagram_email: string;
  account_type: "personal" | "business";
  business_type: string;
};

export const RECOVERY_FORM_LABELS: Record<keyof RecoveryFormAnswers, string> = {
  full_name: "Your full name",
  instagram_username: "Your Instagram username",
  instagram_phone: "Phone number connected to your Instagram",
  instagram_email: "Email connected to your Instagram",
  account_type: "Personal or business account",
  business_type: "Type of business",
};

export function validateRecoveryForm(input: unknown): { ok: true; answers: RecoveryFormAnswers } | { ok: false; errors: Partial<Record<keyof RecoveryFormAnswers, string>> } {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const str = (k: string, max: number) => (typeof raw[k] === "string" ? (raw[k] as string).trim().slice(0, max) : "");
  const answers: RecoveryFormAnswers = {
    full_name: str("full_name", 120),
    instagram_username: str("instagram_username", 60).replace(/^@+/, ""),
    instagram_phone: str("instagram_phone", 40),
    instagram_email: str("instagram_email", 254),
    account_type: raw.account_type === "business" ? "business" : raw.account_type === "personal" ? "personal" : ("" as "personal"),
    business_type: str("business_type", 120),
  };
  const errors: Partial<Record<keyof RecoveryFormAnswers, string>> = {};
  if (answers.full_name.length < 2) errors.full_name = "Enter your full name.";
  if (!/^[A-Za-z0-9._]{1,30}$/.test(answers.instagram_username)) errors.instagram_username = "Enter your Instagram username (letters, numbers, . and _ only).";
  if (!/^\+?[0-9\s()-]{7,20}$/.test(answers.instagram_phone)) errors.instagram_phone = "Enter the phone number connected to your Instagram.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.instagram_email)) errors.instagram_email = "Enter the email connected to your Instagram.";
  if (answers.account_type !== "personal" && answers.account_type !== "business") errors.account_type = "Choose personal or business.";
  if (answers.account_type === "business" && answers.business_type.length < 2) errors.business_type = "Tell us the type of business.";
  if (answers.account_type === "personal") answers.business_type = "";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, answers };
}
