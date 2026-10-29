// The single source of truth for what a recovery case's payment state
// means. Every portal (client, admin, agent) and every server route reads
// the same columns on public.cases and interprets them only through this
// file, so no two screens can disagree about whether a case is paid.
//
// Payment model (Terms §5): a 50% deposit before recovery begins; the
// remaining 50% falls due 24 hours after the recovery is recorded as
// completed. Payment is by bank transfer — the client uploads a receipt
// and an admin verifies the transfer against the bank statement. Only the
// server writes these columns (see migration 011/012).
//
// Pure: no Supabase/Next imports, so it is unit-testable.

export type DepositStatus = "unpaid" | "pending_review" | "paid" | "failed";
export type BalanceStatus = "not_due" | "due" | "pending_review" | "paid" | "failed";
export type PaymentKind = "deposit" | "balance";

// The payment columns on public.cases. `payment_status` predates this
// model and now means the DEPOSIT status (it is what unlocks recovery).
export type PaymentRecord = {
  fee_amount_kobo: number | null;
  payment_status: DepositStatus;
  deposit_amount_kobo?: number | null;
  deposit_paid_at?: string | null;
  recovery_completed_at?: string | null;
  balance_amount_kobo?: number | null;
  balance_due_at?: string | null;
  balance_status?: BalanceStatus | null;
  balance_paid_at?: string | null;
};

// Columns to select wherever a payment record is needed.
export const PAYMENT_COLUMNS =
  "fee_amount_kobo, payment_status, deposit_amount_kobo, deposit_paid_at, recovery_completed_at, balance_amount_kobo, balance_due_at, balance_status, balance_paid_at";

export const BALANCE_WINDOW_MS = 24 * 60 * 60 * 1000;

// 50% of the agreed total, in whole kobo. The balance is computed as
// total − deposit so the two always add up to the total exactly.
export function depositFor(totalKobo: number): number {
  return Math.floor(totalKobo / 2);
}

export function pickPaymentRecord(row: Record<string, unknown>): PaymentRecord {
  return {
    fee_amount_kobo: (row.fee_amount_kobo as number | null) ?? null,
    payment_status: ((row.payment_status as DepositStatus | null) ?? "unpaid") as DepositStatus,
    deposit_amount_kobo: (row.deposit_amount_kobo as number | null) ?? null,
    deposit_paid_at: (row.deposit_paid_at as string | null) ?? null,
    recovery_completed_at: (row.recovery_completed_at as string | null) ?? null,
    balance_amount_kobo: (row.balance_amount_kobo as number | null) ?? null,
    balance_due_at: (row.balance_due_at as string | null) ?? null,
    balance_status: (row.balance_status as BalanceStatus | null) ?? null,
    balance_paid_at: (row.balance_paid_at as string | null) ?? null,
  };
}

export type PaymentTone = "danger" | "warning" | "success" | "neutral";

export type PaymentSummary = {
  totalKobo: number;
  depositKobo: number;
  balanceKobo: number;
  depositStatus: DepositStatus;
  balanceStatus: BalanceStatus;
  balanceOverdue: boolean;
  amountPaidKobo: number;
  outstandingKobo: number;
  completedAt: string | null;
  balanceDueAt: string | null;
  depositConfirmed: boolean; // unlocks the recovery workflow
  settled: boolean; // deposit AND balance verified
  label: string;
  tone: PaymentTone;
};

export function summarizePayment(record: PaymentRecord, now: Date = new Date()): PaymentSummary {
  const totalKobo = record.fee_amount_kobo ?? 0;
  // Older cases have no stored deposit amount: it is 50% of the total.
  const depositKobo = record.deposit_amount_kobo ?? depositFor(totalKobo);
  const balanceKobo = record.balance_amount_kobo ?? totalKobo - depositKobo;
  const depositStatus = record.payment_status;
  const balanceStatus: BalanceStatus = record.balance_status ?? "not_due";
  const depositConfirmed = depositStatus === "paid";
  const balancePaid = balanceStatus === "paid";
  const balanceOverdue =
    (balanceStatus === "due" || balanceStatus === "failed") &&
    !!record.balance_due_at &&
    now.getTime() > new Date(record.balance_due_at).getTime();

  const amountPaidKobo = (depositConfirmed ? depositKobo : 0) + (balancePaid ? balanceKobo : 0);
  // Settled only once BOTH installments are verified (a zero balance is
  // recorded as paid at completion, see completionUpdate).
  const settled = depositConfirmed && balancePaid;

  let label: string;
  let tone: PaymentTone;
  // A ₦0 case is one a MetaShield package covers (fee 0 is only ever set
  // for covered cases; older cases with no stored fee are null, not 0).
  const coveredByPackage = record.fee_amount_kobo === 0 && depositConfirmed;
  if (coveredByPackage) [label, tone] = ["Covered by package", "success"];
  else if (!depositConfirmed) {
    if (depositStatus === "pending_review") [label, tone] = ["Deposit under review", "warning"];
    else if (depositStatus === "failed") [label, tone] = ["Deposit not verified", "danger"];
    else [label, tone] = ["Deposit required", "danger"];
  } else if (balanceStatus === "paid") [label, tone] = ["Paid in full", "success"];
  else if (balanceStatus === "pending_review") [label, tone] = ["Balance under review", "warning"];
  else if (balanceStatus === "due" || balanceStatus === "failed")
    [label, tone] = [balanceOverdue ? "Balance overdue" : "Balance due", "danger"];
  else [label, tone] = ["Payment Confirmed", "success"];

  return {
    totalKobo,
    depositKobo,
    balanceKobo,
    depositStatus,
    balanceStatus,
    balanceOverdue,
    amountPaidKobo,
    outstandingKobo: Math.max(totalKobo - amountPaidKobo, 0),
    completedAt: record.recovery_completed_at ?? null,
    balanceDueAt: record.balance_due_at ?? null,
    depositConfirmed,
    settled,
    label,
    tone,
  };
}

// ── Server-side transitions (applied with conditional updates) ─────────

// A receipt can be submitted for an installment only when that
// installment is actually owed and not already being reviewed — this is
// what stops a refresh or a retry from producing a second payment.
export function canSubmitReceipt(kind: PaymentKind, r: PaymentRecord): boolean {
  if (kind === "deposit") return r.payment_status === "unpaid" || r.payment_status === "failed";
  if (r.payment_status !== "paid") return false;
  return r.balance_status === "due" || r.balance_status === "failed";
}

// Statuses from which an admin may confirm an installment. "unpaid"/"due"
// are included for transfers the admin has verified at the bank but
// whose receipt never reached us.
export function confirmableFrom(kind: PaymentKind): string[] {
  return kind === "deposit" ? ["unpaid", "pending_review", "failed"] : ["due", "pending_review", "failed"];
}

export function isAlreadyConfirmed(kind: PaymentKind, r: PaymentRecord): boolean {
  return kind === "deposit" ? r.payment_status === "paid" : r.balance_status === "paid";
}

export function confirmationUpdate(kind: PaymentKind, r: PaymentRecord, now: Date): Record<string, unknown> {
  if (kind === "deposit") {
    return {
      payment_status: "paid",
      deposit_paid_at: now.toISOString(),
      deposit_amount_kobo: r.deposit_amount_kobo ?? depositFor(r.fee_amount_kobo ?? 0),
    };
  }
  return { balance_status: "paid", balance_paid_at: now.toISOString() };
}

// Recording recovery completion: fixes the completion time and starts
// the 24-hour balance window. Idempotent — returns null if completion
// was already recorded (re-resolving a case never restarts the clock),
// and never before the deposit is confirmed.
export function completionUpdate(r: PaymentRecord, now: Date): Record<string, unknown> | null {
  if (r.recovery_completed_at || r.payment_status !== "paid") return null;
  const total = r.fee_amount_kobo ?? 0;
  const deposit = r.deposit_amount_kobo ?? depositFor(total);
  const balance = Math.max(total - deposit, 0);
  return {
    recovery_completed_at: now.toISOString(),
    deposit_amount_kobo: deposit,
    balance_amount_kobo: balance,
    balance_due_at: new Date(now.getTime() + BALANCE_WINDOW_MS).toISOString(),
    balance_status: balance > 0 ? "due" : "paid",
    ...(balance > 0 ? {} : { balance_paid_at: now.toISOString() }),
  };
}
