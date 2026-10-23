"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  deleteDocument,
  fetchDocuments,
  resolveDocumentCaseId,
  uploadDocument,
  type PortalDocument,
} from "@/lib/portal/data";

// A file waiting to be uploaded (staged but not yet sent to the server)
interface StagedFile {
  id: string; // local UUID for key
  file: File;
}

export default function PortalDocumentsPage() {
  const [documents, setDocuments] = useState<PortalDocument[] | "loading">("loading");
  const [staged, setStaged] = useState<StagedFile[]>([]); // not yet uploaded
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDocuments().then((result) => {
      if (!cancelled) setDocuments(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Stage files locally — don't upload yet
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    setError(null);
    setSubmitSuccess(false);
    const newFiles: StagedFile[] = Array.from(e.target.files).map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
    }));
    setStaged((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  }

  function removeStagedFile(id: string) {
    setStaged((prev) => prev.filter((f) => f.id !== id));
  }

  // Upload all staged files on submit, then notify the team
  async function handleSubmit() {
    if (staged.length === 0) return;
    setError(null);
    setSubmitting(true);
    setSubmitSuccess(false);
    try {
      // Link the upload to a case (?case=<id> from the case page, else the
      // client's case waiting on documents) so the assigned agent sees it.
      const caseParam = new URLSearchParams(window.location.search).get("case");
      const caseId = await resolveDocumentCaseId(caseParam);
      const uploaded = await Promise.all(
        staged.map((sf) => uploadDocument(sf.file, "Uploaded document", caseId))
      );
      setDocuments((prev) => (prev === "loading" ? uploaded : [...uploaded, ...prev]));

      // Tells the team and, for a paid case waiting on documents, moves it
      // on to "Under Review" so it can't sit at "Documents Required".
      // Awaited (errors ignored) so the case has moved before we report
      // success; the documents themselves are already saved either way.
      await fetch("/api/portal/documents/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileNames: staged.map((sf) => sf.file.name),
          caseId,
        }),
      }).catch(() => {});

      setStaged([]);
      setSubmitSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeDocument(doc: PortalDocument) {
    setDocuments((prev) => (prev === "loading" ? prev : prev.filter((d) => d.id !== doc.id)));
    try {
      await deleteDocument(doc);
    } catch (err) {
      // Put it back if the delete failed server-side.
      setDocuments((prev) => (prev === "loading" ? prev : [doc, ...prev]));
      setError(err instanceof Error ? err.message : "Couldn't remove that document.");
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const list = documents === "loading" ? [] : documents;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Document Center</h1>
      <p className="mt-1 text-sm text-ink-500">
        Government ID, business registration, screenshots and platform emails for your cases.
      </p>

      {/* Drop zone */}
      <label
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          staged.length > 0
            ? "border-brand-400 bg-brand-50/40"
            : "border-ink-200 hover:border-brand-400 hover:bg-brand-50/40"
        }`}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-brand-600">
          <path
            d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm font-semibold text-ink-800">
          {staged.length > 0 ? "Add more documents" : "Click to select documents"}
        </span>
        <span className="text-xs text-ink-400">PDF, image or screenshot</span>
        <input
          type="file"
          multiple
          className="hidden"
          disabled={submitting}
          onChange={handleFileChange}
        />
      </label>

      {/* Staged files (queued for submission) */}
      {staged.length > 0 && (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-700">
            Ready to submit — {staged.length} file{staged.length !== 1 ? "s" : ""} queued
          </p>
          <ul className="space-y-2">
            {staged.map((sf) => (
              <li
                key={sf.id}
                className="flex items-center justify-between rounded-lg bg-white px-4 py-2.5 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M8 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7l-4-4Z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinejoin="round"
                      />
                      <path d="M12 3v4h4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-800">{sf.file.name}</p>
                    <p className="text-xs text-ink-400">{formatSize(sf.file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeStagedFile(sf.id)}
                  disabled={submitting}
                  className="ml-4 text-xs font-semibold text-ink-400 hover:text-risk-high disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path
                    d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4Z"
                    fill="currentColor"
                    className="opacity-75"
                  />
                </svg>
                Submitting documents…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6 9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Submit {staged.length} Document{staged.length !== 1 ? "s" : ""} to Agent
              </>
            )}
          </button>
        </div>
      )}

      {/* Success banner */}
      {submitSuccess && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-green-600">
            <path
              d="M20 6 9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            <strong>Documents submitted!</strong> Your agent has been notified and can now access them.
          </span>
        </div>
      )}

      {/* Error */}
      {error ? (
        <p className="mt-3 rounded-xl bg-risk-high-bg px-3.5 py-2.5 text-xs font-medium text-risk-high">
          {error}
        </p>
      ) : null}

      {/* Uploaded documents table */}
      <Card className="mt-6 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-5 py-3 font-medium">Document</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Uploaded</th>
                <th className="px-5 py-3 font-medium">Size</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {documents === "loading" ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-ink-400">
                    Loading documents…
                  </td>
                </tr>
              ) : (
                list.map((doc) => (
                  <tr key={doc.id} className="border-b border-ink-100 last:border-b-0">
                    <td className="max-w-[200px] truncate px-5 py-3.5 font-medium text-ink-800">
                      {doc.name}
                    </td>
                    <td className="px-5 py-3.5 text-ink-600">{doc.category}</td>
                    <td className="px-5 py-3.5 text-ink-600">{doc.uploadedDate}</td>
                    <td className="px-5 py-3.5 text-ink-600">{doc.sizeLabel}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => removeDocument(doc)}
                        className="text-xs font-semibold text-ink-400 hover:text-risk-high"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {documents !== "loading" && documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-ink-400">
                    No documents submitted yet.
                  </td>
                </tr>
              ) : null}
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
