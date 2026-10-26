"use client";

import { useEffect, useState } from "react";
import { BrandLoader } from "@/components/BrandLoader";

type Ticket = {
  id: string;
  source: "contact_form" | "health_check" | "recovery_eligibility" | "payment_receipt";
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: "open" | "resolved";
  created_at: string;
};

const SOURCE_LABEL: Record<Ticket["source"], string> = {
  contact_form: "Contact form",
  health_check: "Account Health Check",
  recovery_eligibility: "Recovery Eligibility Checker",
  payment_receipt: "Payment receipt",
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[] | "loading" | "unauthorized">("loading");
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/support");
      if (res.status === 403) {
        setTickets("unauthorized");
        return;
      }
      const data = await res.json();
      setTickets(data.tickets ?? []);
    }
    load();
  }, []);

  async function toggleStatus(t: Ticket) {
    setBusyId(t.id);
    const nextStatus = t.status === "open" ? "resolved" : "open";
    try {
      const res = await fetch("/api/admin/support/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, status: nextStatus }),
      });
      if (res.ok) {
        setTickets((prev) =>
          Array.isArray(prev) ? prev.map((x) => (x.id === t.id ? { ...x, status: nextStatus } : x)) : prev
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  if (tickets === "unauthorized") {
    return <p className="text-sm text-ink-500">You don&apos;t have access to this page.</p>;
  }

  const visible = tickets === "loading" ? [] : tickets.filter((t) => filter === "all" || t.status === "open");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Support Tickets</h1>
          <p className="mt-1 text-sm text-ink-500">Contact form, health check and recovery submissions.</p>
        </div>
        <div className="flex rounded-lg border border-ink-200 p-1">
          {(["open", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                filter === f ? "bg-brand-600 text-white" : "text-ink-500 hover:bg-ink-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {tickets === "loading" ? (
          <BrandLoader label="Loading…" />
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-ink-100 bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-ink-400">
              {filter === "open" ? "No open tickets — you're all caught up." : "No tickets yet."}
            </p>
          </div>
        ) : (
          visible.map((t) => (
            <div key={t.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-semibold text-ink-600">
                      {SOURCE_LABEL[t.source]}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        t.status === "open" ? "bg-risk-medium-bg text-risk-medium" : "bg-risk-low-bg text-risk-low"
                      }`}
                    >
                      {t.status === "open" ? "Open" : "Resolved"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink-900">{t.name}</p>
                  <p className="text-xs text-ink-500">
                    {t.email}
                    {t.phone ? ` · ${t.phone}` : ""}
                  </p>
                  {t.message ? <p className="mt-2 text-sm text-ink-600">{t.message}</p> : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-xs text-ink-400">
                    {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <button
                    onClick={() => toggleStatus(t)}
                    disabled={busyId === t.id}
                    className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50 disabled:opacity-50"
                  >
                    {t.status === "open" ? "Mark resolved" : "Reopen"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
