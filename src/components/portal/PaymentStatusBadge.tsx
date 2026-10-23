// The one payment badge used by the client portal, the admin dashboard
// and the agent portal. Its text and colour come from summarizePayment()
// (lib/portal/payments.ts), so every screen shows the same status for the
// same case: "Deposit required", "Deposit under review", "Payment
// Confirmed", "Balance due", "Paid in full", …

import { summarizePayment, type PaymentRecord, type PaymentTone } from "@/lib/portal/payments";

const TONE_CLASS: Record<PaymentTone, string> = {
  danger: "bg-risk-high-bg text-risk-high",
  warning: "bg-risk-medium-bg text-risk-medium",
  success: "bg-risk-low-bg text-risk-low",
  neutral: "bg-ink-100 text-ink-600",
};

export function PaymentStatusBadge({ payment }: { payment: PaymentRecord }) {
  const { label, tone } = summarizePayment(payment);
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE_CLASS[tone]}`}>{label}</span>
  );
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

export function formatBalanceDeadline(iso: string): string {
  return (
    new Date(iso).toLocaleString("en-NG", {
      timeZone: "Africa/Lagos",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }) + " WAT"
  );
}

// One-line figures for staff lists: total, paid, outstanding, and the
// balance deadline once recovery is complete.
export function PaymentSummaryLine({ payment }: { payment: PaymentRecord }) {
  const p = summarizePayment(payment);
  if (!p.totalKobo) return null;
  return (
    <p className="mt-1 text-xs text-ink-500">
      Total {naira(p.totalKobo)} · Deposit {naira(p.depositKobo)} · Paid {naira(p.amountPaidKobo)} · Outstanding{" "}
      {naira(p.outstandingKobo)}
      {p.balanceDueAt && !p.settled ? (
        <span className={p.balanceOverdue ? "font-semibold text-risk-high" : "font-semibold text-ink-700"}>
          {" "}
          · Balance due by {formatBalanceDeadline(p.balanceDueAt)}
        </span>
      ) : null}
    </p>
  );
}
