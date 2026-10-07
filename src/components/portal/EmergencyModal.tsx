"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INCIDENTS = [
  { value: "hacked", label: "Account hacked" },
  { value: "restricted", label: "Account restricted" },
  { value: "suspicious_login", label: "Suspicious login detected" },
  { value: "unauthorized_admin", label: "Unauthorized admin added" },
  { value: "impersonation", label: "Impersonation account found" },
  { value: "phishing", label: "Phishing / scam attempt" },
  { value: "other", label: "Other" },
];

export function EmergencyModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentType: selected, details }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setDone(data.caseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function handleViewCase(caseId: string) {
    onClose();
    router.push(`/portal/cases/${caseId}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Red header */}
        <div className="bg-risk-high px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">MetaShield</p>
                <h2 className="text-lg font-bold text-white">Security Incident</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {done ? (
          /* Success state */
          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-risk-low-bg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-risk-low">
                <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-ink-900">Team Notified</h3>
            <p className="mt-2 text-sm text-ink-500">
              Your emergency has been flagged. Your agent has been alerted and will respond
              immediately. Check your case for updates.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => handleViewCase(done)}
                className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                View Case →
              </button>
              <button
                onClick={onClose}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-ink-500 hover:bg-ink-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="px-6 py-5">
            <p className="text-sm font-semibold text-ink-700">What happened?</p>
            <p className="mt-0.5 text-xs text-ink-400">Select the type of incident. Your agent will be notified immediately.</p>

            <div className="mt-4 space-y-2">
              {INCIDENTS.map((inc) => (
                <label
                  key={inc.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    selected === inc.value
                      ? "border-risk-high bg-risk-high/5 text-risk-high"
                      : "border-ink-200 text-ink-700 hover:border-ink-300 hover:bg-ink-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="incident"
                    value={inc.value}
                    checked={selected === inc.value}
                    onChange={() => setSelected(inc.value)}
                    className="accent-risk-high"
                  />
                  <span className="text-sm font-medium">{inc.label}</span>
                </label>
              ))}
            </div>

            {selected && (
              <div className="mt-4">
                <label className="text-xs font-semibold text-ink-500">
                  Additional details <span className="font-normal text-ink-400">(optional)</span>
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  placeholder="e.g. I got a login alert from an unfamiliar location…"
                  className="mt-1.5 w-full resize-none rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 placeholder-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-lg bg-risk-high-bg px-3 py-2 text-xs font-medium text-risk-high">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!selected || busy}
              className="mt-5 w-full rounded-xl bg-risk-high py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Submitting…" : "Submit Incident"}
            </button>

            <p className="mt-3 text-center text-[11px] text-ink-400">
              Your agent will be notified immediately and will respond within the hour.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
