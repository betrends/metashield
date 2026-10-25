"use client";

// Document Center: upload documents for a case (after its deposit is
// confirmed) and see every document you've submitted with its review
// status. Uploads use the same server-checked flow as the case page.

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { CaseDocumentsSection } from "@/components/portal/CaseDocumentsSection";
import {
  deleteDocument,
  fetchCaseDocuments,
  fetchCases,
  fetchDocuments,
  getFileUrl,
  resolveDocumentCaseId,
  type CaseDocumentItem,
  type PortalCase,
  type PortalDocument,
} from "@/lib/portal/data";
import { documentTypeLabel } from "@/lib/portal/workflow";

const STATUS: Record<PortalDocument["reviewStatus"], [string, string]> = {
  submitted: ["Awaiting review", "bg-risk-medium-bg text-risk-medium"],
  approved: ["Approved", "bg-risk-low-bg text-risk-low"],
  rejected: ["Not accepted", "bg-risk-high-bg text-risk-high"],
};

export default function PortalDocumentsPage() {
  const [cases, setCases] = useState<PortalCase[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [caseDocs, setCaseDocs] = useState<CaseDocumentItem[]>([]);
  const [documents, setDocuments] = useState<PortalDocument[] | "loading">("loading");
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [allCases, allDocs] = await Promise.all([fetchCases(), fetchDocuments()]);
      setCases(allCases.filter((c) => !c.cancelledAt));
      setDocuments(allDocs);
    } catch {
      setError("Couldn't load your documents — please refresh.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
    const wanted = new URLSearchParams(window.location.search).get("case");
    resolveDocumentCaseId(wanted).then((id) => setCaseId(id));
  }, [loadAll]);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    fetchCaseDocuments(caseId)
      .then((docs) => {
        if (!cancelled) setCaseDocs(docs);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [caseId, documents]);

  const selected = cases.find((c) => c.id === caseId) ?? null;
  const depositConfirmed = selected?.paymentStatus === "paid";

  async function open(doc: PortalDocument) {
    if (!doc.storagePath) return;
    const url = await getFileUrl(doc.storagePath);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function removeDocument(doc: PortalDocument) {
    if (!window.confirm(`Remove ${doc.name}?`)) return;
    setDocuments((prev) => (prev === "loading" ? prev : prev.filter((d) => d.id !== doc.id)));
    try {
      await deleteDocument(doc);
    } catch (err) {
      setDocuments((prev) => (prev === "loading" ? prev : [doc, ...prev]));
      setError(err instanceof Error ? err.message : "Couldn't remove that document.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Document Center</h1>
      <p className="mt-1 text-sm text-ink-500">
        Government ID, business registration, screenshots and platform emails for your cases.
      </p>

      <Card className="mt-6">
        {cases.length === 0 ? (
          <p className="text-sm text-ink-500">You don&apos;t have an open case yet.</p>
        ) : (
          <>
            {cases.length > 1 ? (
              <label className="mb-4 block text-sm">
                <span className="font-semibold text-ink-700">Case</span>
                <select
                  value={caseId ?? ""}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 sm:w-auto"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} · #{c.id.slice(0, 8).toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {selected && depositConfirmed ? (
              <CaseDocumentsSection caseId={selected.id} documents={caseDocs} onChanged={loadAll} />
            ) : selected ? (
              <p className="text-sm text-ink-500">
                Document uploads open once the deposit for this case is confirmed.
              </p>
            ) : (
              <p className="text-sm text-ink-400">Loading…</p>
            )}
          </>
        )}
      </Card>

      {error ? (
        <p className="mt-3 rounded-xl bg-risk-high-bg px-3.5 py-2.5 text-xs font-medium text-risk-high">{error}</p>
      ) : null}

      <Card className="mt-6 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-5 py-3 font-medium">Document</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Uploaded</th>
                <th className="px-5 py-3 font-medium">Size</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {documents === "loading" ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-ink-400">
                    Loading documents…
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-ink-400">
                    No documents submitted yet.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-ink-100 last:border-b-0">
                    <td className="max-w-[200px] truncate px-5 py-3.5 font-medium text-ink-800">
                      <button type="button" onClick={() => open(doc)} className="hover:underline">
                        {doc.name}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-ink-600">{documentTypeLabel(doc.category)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[doc.reviewStatus][1]}`}>
                        {STATUS[doc.reviewStatus][0]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-ink-600">{doc.uploadedDate}</td>
                    <td className="px-5 py-3.5 text-ink-600">{doc.sizeLabel}</td>
                    <td className="px-5 py-3.5 text-right">
                      {doc.reviewStatus !== "approved" ? (
                        <button onClick={() => removeDocument(doc)} className="text-xs font-semibold text-ink-400 hover:text-risk-high">
                          Remove
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-xs text-ink-400">
        We will never ask for your social media password — do not upload it in any file.
      </p>
    </div>
  );
}
