"use client";

// Full recovery terms in a readable dialog. The client must tick the box
// and press Accept; Decline closes it and payment stays locked.

import { useState } from "react";
import { RECOVERY_TERMS, TERMS_VERSION } from "@/lib/portal/recovery-terms";
import { acceptRecoveryTerms } from "@/lib/portal/data";

export function TermsModal({
  caseId,
  onAccepted,
  onClose,
}: {
  caseId: string;
  onAccepted: () => void;
  onClose: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    if (!agreed || saving) return;
    setSaving(true);
    setError(null);
    try {
      await acceptRecoveryTerms(caseId, TERMS_VERSION);
      onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="terms-title">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="border-b border-ink-100 px-5 py-4">
          <h2 id="terms-title" className="text-lg font-semibold text-ink-900">Recovery terms and conditions</h2>
          <p className="mt-0.5 text-xs text-ink-400">Please read before paying your deposit · Version {TERMS_VERSION}</p>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {RECOVERY_TERMS.map((section) => (
            <section key={section.heading}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-700">{section.heading}</h3>
              {section.paragraphs.map((p, i) => (
                <p key={i} className="mt-2 text-sm leading-relaxed text-ink-700">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
        <div className="border-t border-ink-100 px-5 py-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
            />
            <span className="text-sm text-ink-700">I have read and agree to these recovery terms and conditions.</span>
          </label>
          {error ? <p className="mt-2 text-xs font-medium text-risk-high">{error}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={accept}
              disabled={!agreed || saving}
              className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving…" : "Accept and continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
