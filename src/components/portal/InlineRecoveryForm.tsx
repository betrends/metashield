"use client";

// The recovery form as it appears inside the chat, under the
// "Payment confirmed!" message. Loads that case's documents and form
// status itself so it works wherever the message is shown.

import { useCallback, useEffect, useState } from "react";
import { RecoveryFormCard } from "@/components/portal/RecoveryFormCard";
import { fetchCaseDocuments, fetchCaseWorkflow, type CaseDocumentItem } from "@/lib/portal/data";
import { TERMS_VERSION } from "@/lib/portal/recovery-terms";

export function InlineRecoveryForm({ caseId }: { caseId: string }) {
  const [state, setState] = useState<{ docs: CaseDocumentItem[]; submittedAt: string | null } | "loading" | "error">("loading");

  const load = useCallback(() => {
    Promise.all([fetchCaseDocuments(caseId), fetchCaseWorkflow(caseId, TERMS_VERSION)])
      .then(([docs, wf]) => setState({ docs, submittedAt: wf.formSubmittedAt }))
      .catch(() => setState("error"));
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") return <p className="text-xs text-ink-400">Loading form…</p>;
  if (state === "error")
    return (
      <p className="text-xs text-risk-high">
        Couldn&apos;t load the form.{" "}
        <button type="button" onClick={load} className="font-semibold underline">
          Retry
        </button>
      </p>
    );
  return <RecoveryFormCard caseId={caseId} submittedAt={state.submittedAt} documents={state.docs} onChanged={load} />;
}
