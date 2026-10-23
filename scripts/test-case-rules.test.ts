// Unit tests for src/lib/portal/case-rules.ts — no extra dependencies.
// Run: node --experimental-strip-types --test scripts/test-case-rules.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canMoveToStage,
  paymentConfirmationUpdate,
  pickDefaultCaseId,
  safeStorageName,
  stageAfterDocumentsSubmitted,
  stageRequiresPayment,
} from "../src/lib/portal/case-rules.ts";

test("pre-payment stages don't need payment; everything after does", () => {
  assert.equal(stageRequiresPayment("Payment Pending"), false);
  assert.equal(stageRequiresPayment("New Lead"), false);
  assert.equal(stageRequiresPayment("Documents Required"), true);
  assert.equal(stageRequiresPayment("Under Review"), true);
  assert.equal(stageRequiresPayment("Resolved"), true);
});

test("an unpaid case can't be moved past Payment Pending", () => {
  assert.deepEqual(canMoveToStage("Under Review", "unpaid"), { ok: false, reason: "payment_not_confirmed" });
  assert.deepEqual(canMoveToStage("Documents Required", "pending_review"), {
    ok: false,
    reason: "payment_not_confirmed",
  });
  assert.deepEqual(canMoveToStage("Under Review", "paid"), { ok: true });
  assert.deepEqual(canMoveToStage("Payment Pending", "unpaid"), { ok: true });
});

test("confirming a pending receipt marks paid and asks for documents", () => {
  assert.deepEqual(paymentConfirmationUpdate({ stage: "Payment Pending", payment_status: "pending_review" }), {
    alreadyPaid: false,
    update: { payment_status: "paid", stage: "Documents Required" },
  });
});

test("confirming an unpaid case (no receipt) also works", () => {
  assert.deepEqual(paymentConfirmationUpdate({ stage: "Payment Pending", payment_status: "unpaid" }), {
    alreadyPaid: false,
    update: { payment_status: "paid", stage: "Documents Required" },
  });
});

test("confirming doesn't drag a case that already moved on back to Documents Required", () => {
  assert.deepEqual(paymentConfirmationUpdate({ stage: "Recovery Process", payment_status: "unpaid" }), {
    alreadyPaid: false,
    update: { payment_status: "paid" },
  });
});

test("confirming twice is a no-op", () => {
  const result = paymentConfirmationUpdate({ stage: "Under Review", payment_status: "paid" });
  assert.equal(result.alreadyPaid, true);
  assert.equal(result.update.stage, undefined);
});

test("documents move a paid Documents Required case to Under Review only", () => {
  assert.equal(stageAfterDocumentsSubmitted({ stage: "Documents Required", payment_status: "paid" }), "Under Review");
  assert.equal(stageAfterDocumentsSubmitted({ stage: "Documents Required", payment_status: "unpaid" }), null);
  assert.equal(stageAfterDocumentsSubmitted({ stage: "Recovery Process", payment_status: "paid" }), null);
  assert.equal(stageAfterDocumentsSubmitted({ stage: "Payment Pending", payment_status: "pending_review" }), null);
});

test("default case: prefers the requested stage, else newest open case, else none", () => {
  const cases = [
    { id: "newest-resolved", stage: "Resolved" as const },
    { id: "open", stage: "Recovery Process" as const },
    { id: "needs-docs", stage: "Documents Required" as const },
  ];
  assert.equal(pickDefaultCaseId(cases, "Documents Required"), "needs-docs");
  assert.equal(pickDefaultCaseId(cases), "open");
  assert.equal(pickDefaultCaseId([{ id: "r", stage: "Resolved" }]), null);
  assert.equal(pickDefaultCaseId([]), null);
});

test("storage names can't escape the user's folder", () => {
  assert.equal(safeStorageName("../../other-user/receipt.pdf").includes("/"), false);
  assert.equal(safeStorageName("my photo (1).png"), "my_photo_1_.png");
  assert.equal(safeStorageName(""), "file");
  assert.ok(safeStorageName("a".repeat(500) + ".pdf").length <= 120);
});
