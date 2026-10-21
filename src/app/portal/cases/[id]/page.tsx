"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { CaseStageStepper } from "@/components/portal/CaseStageStepper";
import { fetchCase, submitPaymentReceipt, type PortalCase } from "@/lib/portal/data";
import { formatNaira } from "@/lib/portal/case-fees";
import { bankDetails } from "@/lib/portal/bank-details";

export default function PortalCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const [portalCase, setPortalCase] = useState<PortalCase | null | undefined>(undefined);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetchCase(params.id)
        .then((result) => {
          if (!cancelled) setPortalCase(result);
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
  }, [params.id]);

  async function handleReceiptChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !portalCase) return;
    setReceiptError(null);
    setUploadingReceipt(true);
    try {
      const updated = await submitPaymentReceipt(portalCase.id, file);
      setPortalCase(updated);
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : "Couldn't upload that — please try again.");
    } finally {
      setUploadingReceipt(false);
    }
  }

  if (portalCase === undefined) {
    return <p className="text-sm text-ink-400">Loading case…</p>;
  }

  if (portalCase === null) {
    return (
      <div>
        <Link href="/portal/cases" className="text-sm font-semibold text-ink-500 hover:text-ink-800">
          ← All cases
        </Link>
        <p className="mt-6 text-sm text-ink-500">
          We couldn&apos;t find that case. It may have been resolved or the
          link may be out of date.
        </p>
      </div>
    );
  }

  const displayId = portalCase.id.slice(0, 8).toUpperCase();

  return (
    <div>
      <Link
        href="/portal/cases"
        className="text-sm font-semibold text-ink-500 hover:text-ink-800"
      >
        ← All cases
      </Link>

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

      {portalCase.paymentStatus !== "paid" && portalCase.feeAmountKobo ? (
        <Card className="mt-6 border-brand-200 bg-brand-50/60">
          {portalCase.paymentStatus === "pending_review" ? (
            <>
              <p className="text-sm font-semibold text-brand-800">Payment under review</p>
              <p className="mt-1 text-sm text-ink-600">
                We&apos;ve received your receipt and are confirming it — you&apos;ll get a message
                here as soon as it&apos;s verified and recovery starts.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-brand-800">Payment required to start recovery</p>
              <p className="mt-1 text-sm text-ink-600">
                {portalCase.agentName ? `${portalCase.agentName} is ready to begin — ` : ""}
                transfer{" "}
                <span className="font-semibold text-ink-900">
                  {formatNaira(portalCase.feeAmountKobo)}
                </span>{" "}
                to the account below, then upload your receipt.
              </p>

              <div className="mt-4 grid gap-3 rounded-xl border border-ink-200 bg-white p-4 sm:grid-cols-3">
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

              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-white px-4 py-3.5 text-center hover:border-brand-400 hover:bg-brand-50/40">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-brand-600">
                  <path
                    d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm font-semibold text-brand-700">
                  {uploadingReceipt ? "Uploading…" : "Upload payment receipt"}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  disabled={uploadingReceipt}
                  onChange={handleReceiptChange}
                />
              </label>
              {receiptError ? (
                <p className="mt-2 text-xs font-medium text-risk-high">{receiptError}</p>
              ) : null}
            </>
          )}
        </Card>
      ) : null}

      {portalCase.paymentStatus === "paid" && portalCase.stage === "Documents Required" ? (
        <Card className="mt-6 flex flex-col items-start gap-3 border-brand-200 bg-brand-50/60 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-800">Documents needed</p>
            <p className="mt-1 text-sm text-ink-600">
              Payment confirmed. Upload your ID, screenshots and any emails from the platform so
              {portalCase.agentName ? ` ${portalCase.agentName.split(" ")[0]}` : " your agent"} can start the recovery.
            </p>
          </div>
          <ButtonLink href={`/portal/documents?case=${portalCase.id}`} size="sm">
            Upload documents
          </ButtonLink>
        </Card>
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
    </div>
  );
}
