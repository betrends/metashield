"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { BackLink } from "@/components/BackLink";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { CaseStageStepper } from "@/components/portal/CaseStageStepper";
import {
  cancelCase,
  fetchCase,
  fetchCaseDocuments,
  fetchCaseWorkflow,
  submitPaymentReceipt,
  type CaseDocumentItem,
  type PortalCase,
} from "@/lib/portal/data";
import { TermsModal } from "@/components/portal/TermsModal";
import { RecoveryFormCard } from "@/components/portal/RecoveryFormCard";
import { CaseDocumentsSection } from "@/components/portal/CaseDocumentsSection";
import { TERMS_VERSION } from "@/lib/portal/recovery-terms";
import { nextAction } from "@/lib/portal/workflow";
import { formatNaira } from "@/lib/portal/case-fees";
import { bankDetails } from "@/lib/portal/bank-details";
import { PaymentStatusBadge, formatBalanceDeadline } from "@/components/portal/PaymentStatusBadge";
import { summarizePayment, type PaymentKind } from "@/lib/portal/payments";
import { BrandLoader } from "@/components/BrandLoader";

export default function PortalCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const [portalCase, setPortalCase] = useState<PortalCase | null | undefined>(undefined);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<CaseDocumentItem[]>([]);
  const [workflow, setWorkflow] = useState<{ termsAcceptedAt: string | null; formSubmittedAt: string | null }>({
    termsAcceptedAt: null,
    formSubmittedAt: null,
  });
  const [showTerms, setShowTerms] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    function load() {
      Promise.all([fetchCase(params.id), fetchCaseDocuments(params.id), fetchCaseWorkflow(params.id, TERMS_VERSION)])
        .then(([result, docs, wf]) => {
          if (cancelled) return;
          setPortalCase(result);
          setDocuments(docs);
          setWorkflow(wf);
        })
        .catch(() => {});
    }
    load();
    // Re-read the case so a payment confirmed (or stage changed) by the
    // team shows up without the client having to reload the page.
    const interval = setInterval(load, 20_000);
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", load);
    };
  }, [params.id, refreshKey]);

  async function handleCancel() {
    if (!portalCase) return;
    const paid = portalCase.paymentStatus === "paid" || portalCase.paymentStatus === "pending_review";
    const question = paid
      ? "Your deposit is paid or being checked, so we'll send a cancellation request to our team. As stated in the terms, the deposit is non-refundable. Continue?"
      : "Cancel this case? Your case will be closed and kept in your history.";
    if (!window.confirm(question)) return;
    const reason = window.prompt("Optional: tell us why you're cancelling", "") ?? "";
    const result = await cancelCase(portalCase.id, reason);
    setCancelMessage(
      result.ok
        ? result.outcome === "cancelled"
          ? "Your case has been cancelled."
          : "Your cancellation request has been sent to our team."
        : result.message
    );
    refresh();
  }

  async function handleReceiptChange(e: ChangeEvent<HTMLInputElement>, kind: PaymentKind) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !portalCase || uploadingReceipt) return;
    setReceiptError(null);
    setUploadingReceipt(true);
    try {
      const updated = await submitPaymentReceipt(portalCase.id, file, kind);
      setPortalCase(updated);
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : "Couldn't upload that — please try again.");
    } finally {
      setUploadingReceipt(false);
    }
  }

  if (portalCase === undefined) {
    return <BrandLoader label="Loading case…" />;
  }

  if (portalCase === null) {
    return (
      <div>
        <BackLink fallback="/portal/cases" className="text-sm font-semibold text-ink-500 hover:text-ink-800">
          ← Back
        </BackLink>
        <p className="mt-6 text-sm text-ink-500">
          We couldn&apos;t find that case. It may have been resolved or the
          link may be out of date.
        </p>
      </div>
    );
  }

  const displayId = portalCase.id.slice(0, 8).toUpperCase();
  const payment = summarizePayment(portalCase.payment);
  const isCancelled = !!portalCase.cancelledAt;
  const next = nextAction({
    stage: portalCase.stage,
    depositConfirmed: payment.depositConfirmed,
    depositStatus: payment.depositStatus,
    balanceStatus: payment.balanceStatus,
    cancelled: isCancelled,
    cancellationRequested: !!portalCase.cancellationRequestedAt,
    docs: documents.map((d) => ({ category: d.category, review_status: d.reviewStatus })),
    formSubmitted: !!workflow.formSubmittedAt,
  }).client;

  return (
    <div>
      <BackLink fallback="/portal/cases" className="text-sm font-semibold text-ink-500 hover:text-ink-800">
          ← Back
        </BackLink>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-semibold text-brand-700">
            Case #{displayId}
          </span>
          <h1 className="mt-1 text-2xl font-semibold text-ink-900">{portalCase.title}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {portalCase.platform} · {portalCase.accountHandle}
          </p>
        </div>
        <ButtonLink href={`/portal/messages?case=${portalCase.id}`} variant="outline" size="sm">
          {portalCase.agentName ? `Message ${portalCase.agentName.split(" ")[0]}` : "Message the team"}
        </ButtonLink>
      </div>

      {isCancelled ? (
        <div className="mt-6 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-700">
          <span className="font-semibold">This case has been cancelled.</span> It stays in your history for your records.
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm">
          <span className="font-semibold text-brand-800">Next step: </span>
          <span className="text-ink-700">{next}</span>
        </div>
      )}
      {cancelMessage ? <p className="mt-3 text-sm font-medium text-ink-700">{cancelMessage}</p> : null}

      {portalCase.agentName ? (
        <Card className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
              {portalCase.agentName
                .split(" ")
                .map((p) => p[0])
                .join("")}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Your agent
              </p>
              <p className="text-sm font-semibold text-ink-900">{portalCase.agentName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {portalCase.agentPhone ? (
              <ButtonLink href={`tel:${portalCase.agentPhone}`} variant="outline" size="sm">
                Call {portalCase.agentPhone}
              </ButtonLink>
            ) : null}
            {portalCase.agentEmail ? (
              <ButtonLink href={`mailto:${portalCase.agentEmail}`} variant="ghost" size="sm">
                Email
              </ButtonLink>
            ) : null}
          </div>
        </Card>
      ) : null}

      {payment.label === "Covered by package" && !isCancelled ? (
        <Card className="mt-6 border-accent-green/30 bg-accent-green-bg/60">
          <p className="text-sm font-semibold text-ink-900">Covered by your MetaShield package</p>
          <p className="mt-1 text-sm text-ink-600">
            There&apos;s no recovery fee and no deposit for this case. Recovery and appeal approval aren&apos;t
            guaranteed — Meta makes the final decisions.
          </p>
        </Card>
      ) : null}

      {payment.totalKobo > 0 && !isCancelled ? (
        <Card className="mt-6 border-brand-200 bg-brand-50/60">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink-900">Payment</h2>
            <PaymentStatusBadge payment={portalCase.payment} />
          </div>

          <dl className="mt-4 grid gap-3 rounded-xl border border-ink-200 bg-white p-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-400">Total recovery fee</dt>
              <dd className="text-sm font-semibold text-ink-900">{formatNaira(payment.totalKobo)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-400">Deposit (50%)</dt>
              <dd className="text-sm font-semibold text-ink-900">{formatNaira(payment.depositKobo)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-400">Amount paid</dt>
              <dd className="text-sm font-semibold text-ink-900">{formatNaira(payment.amountPaidKobo)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-400">Outstanding balance</dt>
              <dd className="text-sm font-semibold text-ink-900">{formatNaira(payment.outstandingKobo)}</dd>
            </div>
          </dl>

          {!payment.depositConfirmed ? (
            payment.depositStatus === "pending_review" ? (
              <p className="mt-4 text-sm text-ink-600">
                <span className="font-semibold text-brand-800">Deposit under review.</span> We&apos;ve received your
                receipt and are checking it against our bank account — you&apos;ll get a message here as soon as
                it&apos;s confirmed and recovery starts. There&apos;s no need to pay again.
              </p>
            ) : (
              <>
                <p className="mt-4 text-sm text-ink-600">
                  {payment.depositStatus === "failed" ? (
                    <span className="font-semibold text-risk-high">
                      We couldn&apos;t match your last receipt to a transfer — please check and upload the correct
                      one.{" "}
                    </span>
                  ) : null}
                  {portalCase.agentName ? `${portalCase.agentName} is ready to begin — ` : ""}
                  to start your recovery, transfer the{" "}
                  <span className="font-semibold text-ink-900">deposit of {formatNaira(payment.depositKobo)}</span>{" "}
                  (50% of the total fee) to the account below, then upload your receipt. The remaining{" "}
                  {formatNaira(payment.balanceKobo)} is only due after your recovery is completed.
                </p>
                {workflow.termsAcceptedAt ? (
                  <>
                    <p className="mt-3 text-xs text-ink-500">
                      ✓ Recovery terms accepted ·{" "}
                      <button type="button" onClick={() => setShowTerms(true)} className="font-semibold text-brand-700 hover:underline">
                        view terms
                      </button>
                    </p>
                    <BankDetails />
                    <ReceiptUpload
                      label="Upload deposit receipt"
                      uploading={uploadingReceipt}
                      onChange={(e) => handleReceiptChange(e, "deposit")}
                    />
                  </>
                ) : (
                  <>
                    {/* Bank details are visible but faded until the terms are accepted. */}
                    <BankDetails locked onUnlock={() => setShowTerms(true)} />
                    <p className="mt-3 text-xs text-ink-500">
                      Accept the recovery terms to see the full payment details and upload your receipt.
                    </p>
                  </>
                )}
              </>
            )
          ) : payment.balanceStatus === "not_due" ? (
            <p className="mt-4 text-sm text-ink-600">
              <span className="font-semibold text-risk-low">Payment Confirmed.</span> Your deposit is verified. The
              remaining {formatNaira(payment.balanceKobo)} becomes due 24 hours after your recovery is completed —
              nothing more to pay until then.
            </p>
          ) : payment.balanceStatus === "pending_review" ? (
            <p className="mt-4 text-sm text-ink-600">
              <span className="font-semibold text-brand-800">Final balance under review.</span> We&apos;re checking
              your receipt against our bank account. There&apos;s no need to pay again.
            </p>
          ) : payment.balanceStatus === "paid" ? (
            <p className="mt-4 text-sm font-semibold text-risk-low">Paid in full — thank you.</p>
          ) : (
            <>
              <p className="mt-4 text-sm text-ink-600">
                {payment.balanceStatus === "failed" ? (
                  <span className="font-semibold text-risk-high">
                    We couldn&apos;t match your last receipt to a transfer — please check and upload the correct one.{" "}
                  </span>
                ) : null}
                Your recovery is complete. Please transfer the{" "}
                <span className="font-semibold text-ink-900">final balance of {formatNaira(payment.balanceKobo)}</span>
                {payment.balanceDueAt ? (
                  <>
                    {" "}
                    by{" "}
                    <span className={`font-semibold ${payment.balanceOverdue ? "text-risk-high" : "text-ink-900"}`}>
                      {formatBalanceDeadline(payment.balanceDueAt)}
                    </span>
                    {payment.balanceOverdue ? " (overdue)" : ""}
                  </>
                ) : null}{" "}
                and upload your receipt.
              </p>
              <BankDetails />
              <ReceiptUpload
                label="Upload final balance receipt"
                uploading={uploadingReceipt}
                onChange={(e) => handleReceiptChange(e, "balance")}
              />
            </>
          )}
          {receiptError ? <p className="mt-2 text-xs font-medium text-risk-high">{receiptError}</p> : null}
        </Card>
      ) : null}

      {payment.depositConfirmed && !isCancelled ? (
        <>
          <Card className="mt-6">
            <h2 className="text-sm font-semibold text-ink-900">Recovery form</h2>
            <p className="mt-1 text-sm text-ink-500">Fill this out so we can prepare your case.</p>
            <div className="mt-4">
              <RecoveryFormCard
                caseId={portalCase.id}
                submittedAt={workflow.formSubmittedAt}
                documents={documents}
                onChanged={refresh}
              />
            </div>
          </Card>
          <Card className="mt-6">
            <h2 className="text-sm font-semibold text-ink-900">Documents</h2>
            <p className="mt-1 text-sm text-ink-500">
              Upload what&apos;s required below. Our team reviews each document; you&apos;ll see its status here.
            </p>
            <div className="mt-4">
              <CaseDocumentsSection caseId={portalCase.id} documents={documents} onChanged={refresh} />
            </div>
          </Card>
        </>
      ) : null}

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-ink-900">Case progress</h2>
        <div className="mt-5">
          <CaseStageStepper currentStage={portalCase.stage} />
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-ink-900">Timeline</h2>
        <ol className="mt-5 space-y-4 border-l border-ink-100 pl-5">
          {portalCase.timeline.map((item, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-brand-100" />
              <p className="text-xs text-ink-400">{item.date}</p>
              <p className="text-sm font-medium text-ink-800">{item.event}</p>
            </li>
          ))}
        </ol>
      </Card>

      {!isCancelled && portalCase.stage !== "Resolved" ? (
        <div className="mt-6 text-right">
          {portalCase.cancellationRequestedAt ? (
            <p className="text-xs text-ink-500">Cancellation requested — our team will reply in your messages.</p>
          ) : (
            <button type="button" onClick={handleCancel} className="text-xs font-semibold text-ink-400 hover:text-risk-high">
              Cancel this case
            </button>
          )}
        </div>
      ) : null}

      {showTerms ? (
        <TermsModal
          caseId={portalCase.id}
          onClose={() => setShowTerms(false)}
          onAccepted={() => {
            setShowTerms(false);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function BankDetails({ locked = false, onUnlock }: { locked?: boolean; onUnlock?: () => void }) {
  if (locked) {
    return (
      <div className="relative mt-4 overflow-hidden rounded-xl border border-brand-200 bg-white">
        <div aria-hidden="true" className="pointer-events-none select-none opacity-60 blur-[5px]">
          <BankDetailsGrid />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/50 p-4 text-center">
          <p className="text-xs font-semibold text-ink-700">Please accept the recovery terms first</p>
          <button
            type="button"
            onClick={onUnlock}
            className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Read terms and show payment details
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-xl border border-ink-200 bg-white">
      <BankDetailsGrid />
    </div>
  );
}

function BankDetailsGrid() {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-3">
      <div>
        <p className="text-xs text-ink-400">Bank</p>
        <p className="text-sm font-semibold text-ink-900">{bankDetails.bankName}</p>
      </div>
      <div>
        <p className="text-xs text-ink-400">Account Number</p>
        <p className="text-sm font-semibold text-ink-900">{bankDetails.accountNumber}</p>
      </div>
      <div>
        <p className="text-xs text-ink-400">Account Name</p>
        <p className="text-sm font-semibold text-ink-900">{bankDetails.accountName}</p>
      </div>
    </div>
  );
}

function ReceiptUpload({
  label,
  uploading,
  onChange,
}: {
  label: string;
  uploading: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      className={`mt-4 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-white px-4 py-3.5 text-center ${
        uploading ? "cursor-wait opacity-60" : "cursor-pointer hover:border-brand-400 hover:bg-brand-50/40"
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-brand-600">
        <path
          d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-sm font-semibold text-brand-700">{uploading ? "Uploading…" : label}</span>
      <input type="file" accept="image/*,.pdf" className="hidden" disabled={uploading} onChange={onChange} />
    </label>
  );
}
