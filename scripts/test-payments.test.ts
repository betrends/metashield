// Unit tests for src/lib/portal/payments.ts — no extra dependencies.
// Run: node --experimental-strip-types --test scripts/test-payments.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BALANCE_WINDOW_MS,
  canSubmitReceipt,
  completionUpdate,
  confirmationUpdate,
  depositFor,
  isAlreadyConfirmed,
  summarizePayment,
  type PaymentRecord,
} from "../src/lib/portal/payments.ts";

const FEES = [100_000_00, 120_000_00, 140_000_00, 160_000_00, 175_000_00, 185_000_00, 200_000_00, 220_000_00, 250_000_00, 265_000_00, 285_000_00, 300_000_00, 500_000_00];
const base = (over: Partial<PaymentRecord> = {}): PaymentRecord => ({ fee_amount_kobo: 175_000_00, payment_status: "unpaid", ...over });
const NOW = new Date("2026-10-22T10:00:00Z");

test("[7] deposit is exactly 50% and deposit + balance always equals the total, for every price tier", () => {
  for (const fee of FEES) {
    const s = summarizePayment(base({ fee_amount_kobo: fee }));
    assert.equal(s.depositKobo, fee / 2);
    assert.equal(s.depositKobo + s.balanceKobo, fee);
  }
  assert.equal(depositFor(175_000_00), 87_500_00);
  assert.equal(depositFor(101), 50); // odd kobo: deposit rounds down, balance takes the extra kobo
  const odd = summarizePayment(base({ fee_amount_kobo: 101 }));
  assert.equal(odd.depositKobo + odd.balanceKobo, 101);
});

test("new case: deposit required, nothing paid, whole fee outstanding", () => {
  const s = summarizePayment(base());
  assert.equal(s.label, "Deposit required");
  assert.equal(s.amountPaidKobo, 0);
  assert.equal(s.outstandingKobo, 175_000_00);
  assert.equal(s.depositConfirmed, false);
  assert.equal(s.settled, false);
});

test("[3] pending: receipt under review is not paid and doesn't unlock work", () => {
  const s = summarizePayment(base({ payment_status: "pending_review" }));
  assert.equal(s.label, "Deposit under review");
  assert.equal(s.depositConfirmed, false);
  assert.equal(s.amountPaidKobo, 0);
});

test("[2] failed: a rejected deposit shows as not verified and doesn't unlock work", () => {
  const s = summarizePayment(base({ payment_status: "failed" }));
  assert.equal(s.label, "Deposit not verified");
  assert.equal(s.depositConfirmed, false);
  assert.equal(canSubmitReceipt("deposit", base({ payment_status: "failed" })), true); // client may re-upload
});

test("[1] verified deposit: 'Payment Confirmed', half paid, half outstanding, NOT settled, no deadline yet", () => {
  const r = { ...base(), ...confirmationUpdate("deposit", base({ payment_status: "pending_review" }), NOW) } as PaymentRecord;
  const s = summarizePayment(r, NOW);
  assert.equal(s.label, "Payment Confirmed");
  assert.equal(s.depositConfirmed, true);
  assert.equal(s.amountPaidKobo, 87_500_00);
  assert.equal(s.outstandingKobo, 87_500_00);
  assert.equal(s.balanceStatus, "not_due");
  assert.equal(s.balanceDueAt, null); // countdown does not start at deposit
  assert.equal(s.settled, false);
});

test("[10] historical case marked paid under the old flow counts as deposit paid (per decision)", () => {
  const s = summarizePayment({ fee_amount_kobo: 200_000_00, payment_status: "paid" });
  assert.equal(s.label, "Payment Confirmed");
  assert.equal(s.amountPaidKobo, 100_000_00);
  assert.equal(s.balanceKobo, 100_000_00);
  assert.equal(s.settled, false);
});

test("[8] completion fixes the balance and sets the deadline to exactly 24h after completion", () => {
  const paid: PaymentRecord = { ...base(), ...confirmationUpdate("deposit", base(), NOW) } as PaymentRecord;
  const completedAt = new Date("2026-11-03T15:30:00Z");
  const upd = completionUpdate(paid, completedAt)!;
  assert.equal(upd.recovery_completed_at, completedAt.toISOString());
  assert.equal(upd.balance_amount_kobo, 87_500_00);
  assert.equal(upd.balance_status, "due");
  assert.equal(new Date(upd.balance_due_at as string).getTime() - completedAt.getTime(), BALANCE_WINDOW_MS);
  assert.equal(upd.balance_due_at, "2026-11-04T15:30:00.000Z");
});

test("completion is idempotent and never happens before the deposit is confirmed", () => {
  assert.equal(completionUpdate(base({ payment_status: "pending_review" }), NOW), null);
  const done: PaymentRecord = { ...base({ payment_status: "paid" }), recovery_completed_at: NOW.toISOString() };
  assert.equal(completionUpdate(done, new Date(NOW.getTime() + 5 * BALANCE_WINDOW_MS)), null); // clock never restarts
});

test("balance due, then overdue after the deadline; settled only once the balance is verified", () => {
  const completedAt = new Date("2026-11-03T15:30:00Z");
  const r: PaymentRecord = { ...base({ payment_status: "paid" }), ...completionUpdate(base({ payment_status: "paid" }), completedAt) } as PaymentRecord;
  assert.equal(summarizePayment(r, new Date("2026-11-04T15:29:00Z")).label, "Balance due");
  assert.equal(summarizePayment(r, new Date("2026-11-04T15:31:00Z")).label, "Balance overdue");
  assert.equal(summarizePayment(r, completedAt).settled, false);
  const pending = { ...r, balance_status: "pending_review" as const };
  assert.equal(summarizePayment(pending).label, "Balance under review");
  assert.equal(summarizePayment(pending).settled, false);
  const full = { ...r, ...confirmationUpdate("balance", r, NOW) } as PaymentRecord;
  const s = summarizePayment(full, NOW);
  assert.equal(s.label, "Paid in full");
  assert.equal(s.settled, true);
  assert.equal(s.amountPaidKobo, 175_000_00);
  assert.equal(s.outstandingKobo, 0);
});

test("[9] duplicate charges: a receipt can't be submitted while one is under review or already paid", () => {
  assert.equal(canSubmitReceipt("deposit", base()), true);
  assert.equal(canSubmitReceipt("deposit", base({ payment_status: "pending_review" })), false);
  assert.equal(canSubmitReceipt("deposit", base({ payment_status: "paid" })), false);
  assert.equal(canSubmitReceipt("balance", base({ payment_status: "paid", balance_status: "not_due" })), false);
  assert.equal(canSubmitReceipt("balance", base({ payment_status: "paid", balance_status: "due" })), true);
  assert.equal(canSubmitReceipt("balance", base({ payment_status: "paid", balance_status: "pending_review" })), false);
  assert.equal(canSubmitReceipt("balance", base({ payment_status: "unpaid", balance_status: "due" })), false);
});

test("[4] repeated confirmation is detected as already confirmed", () => {
  assert.equal(isAlreadyConfirmed("deposit", base({ payment_status: "paid" })), true);
  assert.equal(isAlreadyConfirmed("balance", base({ payment_status: "paid", balance_status: "paid" })), true);
  assert.equal(isAlreadyConfirmed("deposit", base({ payment_status: "pending_review" })), false);
});

test("zero-fee (emergency) cases: completion records a zero balance as settled", () => {
  const r: PaymentRecord = { fee_amount_kobo: 0, payment_status: "paid" };
  const done = { ...r, ...completionUpdate(r, NOW) } as PaymentRecord;
  assert.equal(done.balance_status, "paid");
  assert.equal(summarizePayment(done, NOW).settled, true);
});
