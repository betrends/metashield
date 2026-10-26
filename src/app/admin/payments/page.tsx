"use client";

import { useEffect, useState } from "react";
import { formatNaira } from "@/lib/portal/case-fees";
import { PaymentStatusBadge, PaymentSummaryLine } from "@/components/portal/PaymentStatusBadge";
import { summarizePayment, type PaymentKind, type PaymentRecord } from "@/lib/portal/payments";
import { BrandLoader } from "@/components/BrandLoader";

type AdminCaseRow = {
  id: string;
  title: string;
  platform: string;
  accountHandle: string;
  issue: string | null;
  stage: string;
  agentName: string | null;
  createdAt: string;
  clientName: string | null;
  clientEmail: string | null;
  payment: PaymentRecord;
  receiptUrl: string | null;
  balanceReceiptUrl: string | null;
  depositReceiptAt: string | null;
  balanceReceiptAt: string | null;
};

// Date and time in Lagos time, e.g. "23 Oct 2026, 08:45".
function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// The payment timeline for one case, oldest first; only steps that happened.
function PaymentDates({ c }: { c: AdminCaseRow }) {
  const p = c.payment;
  const rows: [string, string | null][] = [
    ["Case opened", formatDateTime(c.createdAt)],
    ["Deposit receipt uploaded", formatDateTime(c.depositReceiptAt)],
    ["Deposit confirmed", formatDateTime(p.deposit_paid_at)],
    ["Recovery completed", formatDateTime(p.recovery_completed_at)],
    ["Balance due by", formatDateTime(p.balance_due_at)],
    ["Balance receipt uploaded", formatDateTime(c.balanceReceiptAt)],
    ["Balance confirmed", formatDateTime(p.balance_paid_at)],
  ];
  const shown = rows.filter(([, value]) => value);
  if (shown.length === 0) return null;
  return (
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      {shown.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-ink-400">{label}</dt>
          <dd className="font-medium text-ink-700">{value} WAT</dd>
        </div>
      ))}
    </dl>
  );
}

// Which installment this row is waiting on: the deposit until it is
// verified, then the final balance once recovery completion made it due.
function pendingInstallment(payment: PaymentRecord): PaymentKind {
  return summarizePayment(payment).depositConfirmed ? "balance" : "deposit";
}

export default function AdminPaymentsPage() {
  const [cases, setCases] = useState<AdminCaseRow[] | "loading" | "unauthorized">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ caseId: string; message: string } | null>(null);

  async function load() {
    const res = await fetch("/api/admin/payments", { cache: "no-store" });
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

  async function act(action: "confirm" | "reject", c: AdminCaseRow) {
    const kind = pendingInstallment(c.payment);
    const summary = summarizePayment(c.payment);
    const amount = formatNaira(kind === "deposit" ? summary.depositKobo : summary.balanceKobo);
    const hasReceipt = kind === "deposit" ? !!c.receiptUrl : !!c.balanceReceiptUrl;
    let reason = "";
    let reference = "";
    if (action === "confirm") {
      const question = hasReceipt
        ? `Confirm that the ${kind} of ${amount} has arrived in the bank account?`
        : `No receipt has been uploaded for this ${kind}. Only confirm if you've checked the bank account and ${amount} has arrived.`;
      if (!window.confirm(question)) return;
      // Optional bank transfer reference, saved with the payment record.
      reference = window.prompt("Bank transfer reference (optional):", "") ?? "";
    } else {
      const answer = window.prompt(
        `Reject this ${kind} receipt? The client will be asked to re-upload. Optional reason for the client:`,
        ""
      );
      if (answer === null) return;
      reason = answer;
    }

    setBusyId(c.id);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/payments/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: c.id, kind, reason, reference }),
      });
      if (res.ok) {
        // Re-read the queue from the server rather than guessing locally.
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError({
          caseId: c.id,
          message: data.message || data.detail || data.error || "That didn't go through — please try again.",
        });
      }
    } catch {
      setActionError({ caseId: c.id, message: "Network error — nothing was changed. Please try again." });
    } finally {
      setBusyId(null);
    }
  }

  if (cases === "unauthorized") {
    return <p className="text-sm text-ink-500">You don&apos;t have access to this page.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Pending Payments</h1>
      <p className="mt-1 text-sm text-ink-500">
        Deposits and final balances waiting on a bank transfer, newest first. Check the bank account before
        confirming.
      </p>

      {cases === "loading" ? (
        <BrandLoader label="Loading…" />
      ) : cases.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-ink-400">Nothing pending — every case is paid up.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {cases.map((c) => {
            const summary = summarizePayment(c.payment);
            const kind = pendingInstallment(c.payment);
            const amountKobo = kind === "deposit" ? summary.depositKobo : summary.balanceKobo;
            const receiptUrl = kind === "deposit" ? c.receiptUrl : c.balanceReceiptUrl;
            const underReview =
              kind === "deposit" ? summary.depositStatus === "pending_review" : summary.balanceStatus === "pending_review";
            return (
              <div key={c.id} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-brand-600">
                        Case #{c.id.slice(0, 8).toUpperCase()}
                      </span>
                      <PaymentStatusBadge payment={c.payment} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ink-900">{c.title}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {c.platform} · {c.accountHandle} {c.issue ? `· ${c.issue}` : ""}
                    </p>
                    <p className="mt-2 text-xs text-ink-600">
                      {c.clientName || "Unknown client"}
                      {c.clientEmail ? ` · ${c.clientEmail}` : ""}
                    </p>
                    {c.agentName ? <p className="mt-0.5 text-xs text-ink-400">Agent: {c.agentName}</p> : null}
                    <PaymentSummaryLine payment={c.payment} />
                    <PaymentDates c={c} />
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                      {kind === "deposit" ? "Deposit (50%)" : "Final balance (50%)"}
                    </p>
                    <p className="text-lg font-semibold text-ink-900">{formatNaira(amountKobo)}</p>
                    {receiptUrl ? (
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        View receipt →
                      </a>
                    ) : null}
                    <div className="flex gap-2">
                      {underReview ? (
                        <button
                          disabled={busyId === c.id}
                          onClick={() => act("reject", c)}
                          className="inline-flex items-center justify-center rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition-all hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Reject
                        </button>
                      ) : null}
                      <button
                        disabled={busyId === c.id}
                        onClick={() => act("confirm", c)}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {busyId === c.id ? "Saving…" : kind === "deposit" ? "Confirm Deposit" : "Confirm Balance"}
                      </button>
                    </div>
                    {actionError?.caseId === c.id ? (
                      <p className="max-w-[240px] text-right text-xs font-medium text-risk-high">{actionError.message}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
