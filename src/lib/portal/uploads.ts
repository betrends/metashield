"use client";

// Case document uploads from the browser:
//  1. check type and size locally (fast feedback),
//  2. upload straight to the client's own Storage folder with progress
//     (XMLHttpRequest — supabase-js upload has no progress events),
//  3. ask the server to verify and register it (/api/portal/documents/register),
//     which re-checks the stored file's real type and size.
// Any failure returns a message the UI can show next to a Retry button.

import { createClient } from "@/lib/supabase/client";
import { safeStorageName } from "@/lib/portal/case-rules";
import { validateDocumentFile, type DocumentType } from "@/lib/portal/workflow";

export type RegisteredDocument = {
  id: string;
  name: string;
  category: string;
  size_bytes: number | null;
  storage_path: string | null;
  created_at: string;
  case_id: string | null;
  review_status: "submitted" | "approved" | "rejected";
  mime_type: string | null;
};

export type UploadResult = { ok: true; document: RegisteredDocument } | { ok: false; error: string };

export async function uploadCaseDocument(
  caseId: string,
  category: DocumentType,
  file: File,
  onProgress?: (fraction: number) => void
): Promise<UploadResult> {
  const localProblem = validateDocumentFile(file);
  if (localProblem) return { ok: false, error: localProblem };

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: "You need to be signed in." };

  const path = `${session.user.id}/${caseId}/${Date.now()}-${safeStorageName(file.name)}`;
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/documents/${path.split("/").map(encodeURIComponent).join("/")}`;

  const uploaded = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.min(e.loaded / e.total, 0.99));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve({ ok: true })
        : resolve({ ok: false, error: xhr.status === 413 ? "That file is too large." : "Upload failed — please retry." });
    xhr.onerror = () => resolve({ ok: false, error: "Network error — check your connection and retry." });
    xhr.send(file);
  });
  if (!uploaded.ok) return { ok: false, error: uploaded.error ?? "Upload failed — please retry." };

  try {
    const res = await fetch("/api/portal/documents/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, category, storagePath: path, name: file.name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.document) return { ok: false, error: data.message || "Couldn't save the document — please retry." };
    onProgress?.(1);
    return { ok: true, document: data.document as RegisteredDocument };
  } catch {
    return { ok: false, error: "Network error — check your connection and retry." };
  }
}

// Tells the server a batch is complete: it posts "Document upload
// received…" once and moves the case on when everything required is in.
export async function notifyDocumentsUploaded(caseId: string, documentIds: string[]): Promise<{ stage?: string }> {
  try {
    const res = await fetch("/api/portal/documents/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, documentIds }),
    });
    return await res.json().catch(() => ({}));
  } catch {
    return {};
  }
}
