"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ClientDocument = {
  id: string;
  filename: string;
  category: string;
  size: number;
  uploadedAt: string;
  clientEmail: string;
  clientName: string;
  url?: string;
};

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<ClientDocument[] | "loading" | "error">("loading");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/documents");
        if (!res.ok) throw new Error("Failed to load documents");
        const data = await res.json();
        setDocuments(data.documents ?? []);
      } catch {
        setDocuments("error");
      }
    }
    load();
  }, []);

  if (documents === "loading") {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Client Documents</h1>
          <p className="mt-1 text-sm text-ink-500">All files uploaded by clients for their cases.</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-12 text-center">
          <p className="text-sm text-ink-400">Loading documents…</p>
        </div>
      </div>
    );
  }

  if (documents === "error") {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Client Documents</h1>
          <p className="mt-1 text-sm text-ink-500">All files uploaded by clients for their cases.</p>
        </div>
        <div className="rounded-2xl border border-risk-high-bg bg-risk-low-bg p-4">
          <p className="text-sm text-risk-high">Unable to load documents. Please check your database connection.</p>
        </div>
      </div>
    );
  }

  // Group documents by client
  const groupedByClient = documents.reduce(
    (acc, doc) => {
      const key = doc.clientEmail;
      if (!acc[key]) {
        acc[key] = { clientName: doc.clientName, clientEmail: doc.clientEmail, docs: [] };
      }
      acc[key].docs.push(doc);
      return acc;
    },
    {} as Record<string, { clientName: string; clientEmail: string; docs: ClientDocument[] }>
  );

  const clients = Object.values(groupedByClient).sort((a, b) =>
    a.clientName.localeCompare(b.clientName)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Client Documents</h1>
        <p className="mt-1 text-sm text-ink-500">
          {documents.length} file{documents.length !== 1 ? "s" : ""} uploaded by clients
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-ink-100 bg-white p-12 text-center">
          <p className="text-sm text-ink-400">No documents uploaded yet</p>
        </div>
      ) : (
        clients.map((client) => (
          <div key={client.clientEmail} className="space-y-3">
            <div className="flex items-center gap-2 border-b border-ink-100 py-3">
              <div>
                <p className="font-semibold text-ink-900">{client.clientName}</p>
                <p className="text-xs text-ink-400">{client.clientEmail}</p>
              </div>
              <span className="ml-auto rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600">
                {client.docs.length} file{client.docs.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-ink-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Filename</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Uploaded</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {client.docs.map((doc) => (
                    <tr key={doc.id} className="border-t border-ink-100 hover:bg-ink-50">
                      <td className="px-4 py-3 font-mono text-xs text-ink-700">{doc.filename}</td>
                      <td className="px-4 py-3 text-ink-600">{doc.category || "—"}</td>
                      <td className="px-4 py-3 text-ink-600">
                        {new Date(doc.uploadedAt).toLocaleDateString()} {new Date(doc.uploadedAt).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 text-ink-600">
                        {(doc.size / 1024).toFixed(0)} KB
                      </td>
                      <td className="px-4 py-3 text-right">
                        {doc.url ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                          >
                            View ↗
                          </a>
                        ) : (
                          <span className="text-xs text-ink-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
