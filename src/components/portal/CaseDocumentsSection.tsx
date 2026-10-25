"use client";

// Document upload area for one case, shown after the deposit is confirmed.
// Lists the documents the case needs, accepted formats and size limit,
// and the status of everything uploaded (submitted / approved / rejected
// with the reviewer's note). Each file shows upload progress; a failed
// file can be retried. When a batch finishes, the server posts
// "Document upload received…" in the chat and moves the case on when
// everything required is in.

import { ChangeEvent, useState } from "react";
import {
  ACCEPT_ATTRIBUTE,
  ACCEPTED_MIME_TYPES,
  DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  type DocumentType,
} from "@/lib/portal/workflow";
import { notifyDocumentsUploaded, uploadCaseDocument } from "@/lib/portal/uploads";
import { getFileUrl, type CaseDocumentItem } from "@/lib/portal/data";

type Pending = { key: string; file: File; category: DocumentType; progress: number; error: string | null; done: boolean };

function sizeLabel(bytes: number | null) {
  if (!bytes) return "—";
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS: Record<CaseDocumentItem["reviewStatus"], [string, string]> = {
  submitted: ["Awaiting review", "bg-risk-medium-bg text-risk-medium"],
  approved: ["Approved", "bg-risk-low-bg text-risk-low"],
  rejected: ["Not accepted", "bg-risk-high-bg text-risk-high"],
};

export function CaseDocumentsSection({
  caseId,
  documents,
  onChanged,
  only,
}: {
  caseId: string;
  documents: CaseDocumentItem[];
  onChanged: () => void;
  // Limit to some document types (the recovery form shows only the screenshot).
  only?: DocumentType[];
}) {
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const types = DOCUMENT_TYPES.filter((d) => !only || only.includes(d.value));

  async function runUploads(items: Pending[]) {
    setBusy(true);
    setNotice(null);
    const registered: string[] = [];
    for (const item of items) {
      setPending((prev) => prev.map((p) => (p.key === item.key ? { ...p, error: null, progress: 0 } : p)));
      const result = await uploadCaseDocument(caseId, item.category, item.file, (fraction) =>
        setPending((prev) => prev.map((p) => (p.key === item.key ? { ...p, progress: fraction } : p)))
      );
      if (result.ok) {
        registered.push(result.document.id);
        setPending((prev) => prev.map((p) => (p.key === item.key ? { ...p, progress: 1, done: true } : p)));
      } else {
        setPending((prev) => prev.map((p) => (p.key === item.key ? { ...p, error: result.error } : p)));
      }
    }
    if (registered.length > 0) {
      await notifyDocumentsUploaded(caseId, registered);
      setNotice("Document upload received. Your documents have been submitted successfully and are awaiting review.");
      setPending((prev) => prev.filter((p) => !p.done));
      onChanged();
    }
    setBusy(false);
  }

  function choose(category: DocumentType, e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const items = files.map((file) => ({
      key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      category,
      progress: 0,
      error: null,
      done: false,
    }));
    setPending((prev) => [...prev, ...items]);
    void runUploads(items);
  }

  async function open(doc: CaseDocumentItem) {
    if (!doc.storagePath) return;
    const url = await getFileUrl(doc.storagePath);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <p className="text-xs text-ink-500">
        Accepted: {Object.values(ACCEPTED_MIME_TYPES).filter((v, i, a) => a.indexOf(v) === i).join(", ")} · up to{" "}
        {MAX_DOCUMENT_BYTES / (1024 * 1024)} MB per file
      </p>

      <ul className="mt-3 space-y-3">
        {types.map((type) => {
          const docs = documents.filter((d) => d.category === type.value);
          const usable = docs.some((d) => d.reviewStatus !== "rejected");
          return (
            <li key={type.value} className="rounded-xl border border-ink-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">
                    {type.label}{" "}
                    {type.required ? (
                      <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-700">Required</span>
                    ) : (
                      <span className="ml-1 text-[11px] font-normal text-ink-400">Optional</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">{type.hint}</p>
                </div>
                <label
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    busy ? "cursor-wait border-ink-100 text-ink-300" : "cursor-pointer border-brand-300 text-brand-700 hover:bg-brand-50"
                  }`}
                >
                  {usable ? "Add another" : "Upload"}
                  <input type="file" accept={ACCEPT_ATTRIBUTE} multiple className="hidden" disabled={busy} onChange={(e) => choose(type.value, e)} />
                </label>
              </div>

              {docs.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {docs.map((d) => (
                    <li key={d.id} className="text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => open(d)} className="max-w-[60%] truncate font-medium text-ink-800 hover:underline">
                          {d.name}
                        </button>
                        <span className="text-ink-400">{sizeLabel(d.sizeBytes)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS[d.reviewStatus][1]}`}>
                          {STATUS[d.reviewStatus][0]}
                        </span>
                      </div>
                      {d.reviewStatus === "rejected" && d.reviewNote ? (
                        <p className="mt-0.5 text-risk-high">Reason: {d.reviewNote} — please upload a new one.</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {pending
                .filter((p) => p.category === type.value)
                .map((p) => (
                  <div key={p.key} className="mt-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-ink-700">{p.file.name}</span>
                      {p.error ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => runUploads([p])}
                          className="shrink-0 font-semibold text-brand-700 hover:underline disabled:opacity-40"
                        >
                          Retry
                        </button>
                      ) : (
                        <span className="shrink-0 text-ink-400">{Math.round(p.progress * 100)}%</span>
                      )}
                    </div>
                    {p.error ? (
                      <p className="mt-1 text-risk-high">{p.error}</p>
                    ) : (
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.round(p.progress * 100)}%` }} />
                      </div>
                    )}
                  </div>
                ))}
            </li>
          );
        })}
      </ul>

      {notice ? (
        <p className="mt-3 rounded-xl bg-risk-low-bg px-3.5 py-2.5 text-xs font-medium text-risk-low">{notice}</p>
      ) : null}
    </div>
  );
}
