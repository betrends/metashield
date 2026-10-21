"use client";

import { useEffect, useState } from "react";
import { formatNaira } from "@/lib/portal/case-fees";

type AdminCaseRow = {
  id: string;
  title: string;
  platform: string;
  accountHandle: string;
  issue: string | null;
  feeAmountKobo: number | null;
  paymentStatus: "unpaid" | "pending_review" | "paid" | "failed";
  agentName: string | null;
  createdAt: string;
  clientName: string | null;
  clientEmail: string | null;
  receiptUrl: string | null;
};

function StatusBadge({ status }: { status: AdminCaseRow["paymentStatus"] }) {
  if (status === "pending_review") {
    return (
      <span className="rounded-full bg-risk-medium-bg px-2.5 py-1 text-xs font-semibold text-risk-medium">
        Receipt submitted — review needed
      </span>
    );
  }
  return (
    <span className="rounded-full bg-risk-high-bg px-2.5 py-1 text-xs font-semibold text-risk-high">
      Not paid yet
    </span>
  );
}

export default function AdminPaymentsPage() {
  const [cases, setCases] = useState<AdminCaseRow[] | "loading" | "unauthorized">("loading");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<{ caseId: string; message: string } | null>(null);

  async function load() {
    const res = await fetch("/api/admin/payments");
    if (res.status === 403) {
      setCases("unauthorized");
      return;
    }
    const data = await res.json();
    setCases(data.cases ?? []);
  }

  useEffect(() => {
    // Reading from the API (an external system) can only safely happen
    // after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleConfirm(caseId: string, hasReceipt: boolean) {
    if (
      !hasReceipt &&
      !window.confirm(
        "No receipt has been uploaded for this case. Only confirm if you've checked the bank account and the payment has arrived."
      )
    ) {
      return;
    }
    setConfirmingId(caseId);
    setConfirmError(null);
    try {
      const res = await fetch("/api/admin/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      if (res.ok) {
        setCases((prev) => (Array.isArray(prev) ? prev.filter((c) => c.id !== caseId) : prev));
      } else {
        const data = await res.json().catch(() => ({}));
        setConfirmError({
          caseId,
          message: data.detail || data.error || "Couldn't confirm this payment — please try again.",
        });
      }
    } catch {
      setConfirmError({ caseId, message: "Network error — the payment was not confirmed. Please try again." });
    } finally {
      setConfirmingId(null);
    }
  }

  if (cases === "unauthorized") {
    return <p className="text-sm text-ink-500">You don&apos;t have access to this page.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Pending Payments</h1>
      <p className="mt-1 text-sm text-ink-500">
        Recovery cases waiting on a bank-transfer payment, newest first.
      </p>

      {cases === "loading" ? (
        <p className="mt-8 text-sm text-ink-400">Loading…</p>
      ) : cases.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-ink-400">Nothing pending — every case is paid up.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {cases.map((c) => (
            <div key={c.id} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-brand-600">
                      Case #{c.id.slice(0, 8).toUpperCase()}
                    </span>
                    <StatusBadge status={c.paymentStatus} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{c.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {c.platform} · {c.accountHandle} {c.issue ? `· ${c.issue}` : ""}
                  </p>
                  <p className="mt-2 text-xs text-ink-600">
                    {c.clientName || "Unknown client"}
                    {c.clientEmail ? ` · ${c.clientEmail}` : ""}
                  </p>
                  {c.agentName ? (
                    <p className="mt-0.5 text-xs text-ink-400">Agent: {c.agentName}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <p className="text-lg font-semibold text-ink-900">
                    {c.feeAmountKobo ? formatNaira(c.feeAmountKobo) : "—"}
                  </p>
                  {c.receiptUrl ? (
                    <a
                      href={c.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      View receipt →
                    </a>
                  ) : null}
                  <button
                    disabled={confirmingId === c.id}
                    onClick={() => handleConfirm(c.id, !!c.receiptUrl)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {confirmingId === c.id ? "Confirming…" : "Confirm Payment"}
                  </button>
                  {confirmError?.caseId === c.id ? (
                    <p className="max-w-[220px] text-right text-xs font-medium text-risk-high">{confirmError.message}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
