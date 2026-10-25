"use client";

// MetaShield's recovery form, shown in the case chat right under the
// "Payment confirmed!" message and on the case page. Question 1 (account
// screenshot) uploads to the case; the rest are saved with the case.
// After submitting it shows a confirmation instead of the form.

import { FormEvent, useState } from "react";
import { CaseDocumentsSection } from "@/components/portal/CaseDocumentsSection";
import { RECOVERY_FORM_LABELS, validateRecoveryForm, type RecoveryFormAnswers } from "@/lib/portal/recovery-form";
import { submitRecoveryForm, type CaseDocumentItem } from "@/lib/portal/data";

type Draft = Record<keyof RecoveryFormAnswers, string>;
const EMPTY: Draft = { full_name: "", instagram_username: "", instagram_phone: "", instagram_email: "", account_type: "", business_type: "" };

export function RecoveryFormCard({
  caseId,
  submittedAt,
  documents,
  onChanged,
}: {
  caseId: string;
  submittedAt: string | null;
  documents: CaseDocumentItem[];
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof RecoveryFormAnswers, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (submittedAt) {
    return (
      <div className="rounded-xl border border-risk-low/30 bg-risk-low-bg px-4 py-3 text-sm text-risk-low">
        ✓ Recovery form submitted on{" "}
        {new Date(submittedAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{" "}
        WAT.
      </div>
    );
  }

  const screenshotUploaded = documents.some((d) => d.category === "error_screenshot" && d.reviewStatus !== "rejected");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setMessage(null);
    const check = validateRecoveryForm(draft);
    if (!check.ok) {
      setErrors(check.errors);
      setMessage("Please check the highlighted answers.");
      return;
    }
    if (!screenshotUploaded) {
      setMessage("Please upload a screenshot of your account when you log in (question 1).");
      return;
    }
    setErrors({});
    setSaving(true);
    const result = await submitRecoveryForm(caseId, check.answers);
    setSaving(false);
    if (result.ok) {
      onChanged();
    } else {
      setErrors((result.errors ?? {}) as typeof errors);
      setMessage(result.message);
    }
  }

  const input = (key: keyof RecoveryFormAnswers, type = "text", placeholder = "") => (
    <label className="block text-sm">
      <span className="font-semibold text-ink-700">{RECOVERY_FORM_LABELS[key]}</span>
      <input
        type={type}
        value={draft[key]}
        placeholder={placeholder}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-100 ${
          errors[key] ? "border-risk-high" : "border-ink-200 focus:border-brand-400"
        }`}
      />
      {errors[key] ? <span className="mt-1 block text-xs text-risk-high">{errors[key]}</span> : null}
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-brand-200 bg-white p-4 text-left">
      <p className="text-sm font-semibold text-ink-900">Recovery form</p>

      <div>
        <p className="text-sm font-semibold text-ink-700">1. A screenshot of your account when you log in</p>
        <div className="mt-2">
          <CaseDocumentsSection caseId={caseId} documents={documents} onChanged={onChanged} only={["error_screenshot"]} />
        </div>
      </div>

      {input("full_name")}
      {input("instagram_username", "text", "e.g. yourname")}
      <div className="grid gap-4 sm:grid-cols-2">
        {input("instagram_phone", "tel", "+234 803 123 4567")}
        {input("instagram_email", "email", "you@example.com")}
      </div>

      <div className="text-sm">
        <span className="font-semibold text-ink-700">{RECOVERY_FORM_LABELS.account_type}</span>
        <div className="mt-2 flex gap-2">
          {(["personal", "business"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, account_type: v }))}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                draft.account_type === v ? "border-brand-500 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-600 hover:bg-ink-50"
              }`}
            >
              {v === "personal" ? "Personal" : "Business"}
            </button>
          ))}
        </div>
        {errors.account_type ? <span className="mt-1 block text-xs text-risk-high">{errors.account_type}</span> : null}
      </div>
      {draft.account_type === "business" ? input("business_type", "text", "e.g. fashion, food, beauty") : null}

      {message ? <p className="text-xs font-medium text-risk-high">{message}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {saving ? "Submitting…" : "Submit recovery form"}
      </button>
    </form>
  );
}
