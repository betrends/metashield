"use client";

import { useEffect, useState } from "react";
import { caseStages, type CaseStage } from "@/lib/portal/mock-data";

type AdminCase = {
  id: string;
  title: string;
  platform: string;
  accountHandle: string;
  stage: CaseStage;
  paymentStatus: "unpaid" | "pending_review" | "paid" | "failed";
  agentName: string | null;
  createdAt: string;
  clientName: string | null;
  clientEmail: string | null;
  screenshotUrl: string | null;
};

type AgentOption = { id: string; name: string; active: boolean };

function PaymentPill({ status }: { status: AdminCase["paymentStatus"] }) {
  if (status === "paid") {
    return (
      <span className="rounded-full bg-risk-low-bg px-2.5 py-1 text-[11px] font-semibold text-risk-low">Paid</span>
    );
  }
  if (status === "pending_review") {
    return (
      <span className="rounded-full bg-risk-medium-bg px-2.5 py-1 text-[11px] font-semibold text-risk-medium">
        Receipt in review
      </span>
    );
  }
  return (
    <span className="rounded-full bg-risk-high-bg px-2.5 py-1 text-[11px] font-semibold text-risk-high">Unpaid</span>
  );
}

export default function AdminCasesPage() {
  const [cases, setCases] = useState<AdminCase[] | "loading" | "unauthorized">("loading");
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isAgent, setIsAgent] = useState(false);
  const [actionError, setActionError] = useState<{ caseId: string; message: string } | null>(null);

  async function loadCases() {
    const casesRes = await fetch("/api/admin/cases", { cache: "no-store" });
    if (casesRes.status === 403) {
      setCases("unauthorized");
      return;
    }
    if (!casesRes.ok) return;
    const casesData = await casesRes.json();
    setCases(casesData.cases ?? []);
    if (casesData.role === "agent") setIsAgent(true);
  }

  useEffect(() => {
    async function load() {
      await loadCases();
      const agentsRes = await fetch("/api/admin/agents");
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents((agentsData.agents ?? []).map((a: AgentOption) => ({ id: a.id, name: a.name, active: a.active })));
      }
    }
    // Reading from the API (an external system) can only safely happen
    // after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Keep payment status and stages current (e.g. a payment the admin
    // just confirmed elsewhere) without a manual reload.
    const interval = setInterval(loadCases, 30_000);
    const onFocus = () => loadCases();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  async function handleStageChange(caseId: string, stage: CaseStage) {
    setBusyId(caseId);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/cases/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, stage }),
      });
      if (res.ok) {
        setCases((prev) =>
          Array.isArray(prev) ? prev.map((c) => (c.id === caseId ? { ...c, stage } : c)) : prev
        );
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError({
          caseId,
          message:
            data.message ||
            (res.status === 403 ? "You can't change this case." : "Couldn't update the stage — please try again."),
        });
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleAssign(caseId: string, agentId: string) {
    if (!agentId) return;
    setBusyId(caseId);
    try {
      const res = await fetch("/api/admin/cases/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, agentId }),
      });
      if (!res.ok) {
        setActionError({ caseId, message: "Couldn't assign that agent — please try again." });
      } else {
        const agentName = agents.find((a) => a.id === agentId)?.name ?? null;
        setCases((prev) =>
          Array.isArray(prev) ? prev.map((c) => (c.id === caseId ? { ...c, agentName } : c)) : prev
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  if (cases === "unauthorized") {
    return <p className="text-sm text-ink-500">You don&apos;t have access to this page.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">
        {isAgent ? "My Cases" : "Recovery Requests"}
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        {isAgent
          ? "Cases assigned to you. Update the stage as you make progress."
          : "Every case, any stage. Changing the stage or agent here notifies the client automatically."}
      </p>

      {cases === "loading" ? (
        <p className="mt-8 text-sm text-ink-400">Loading…</p>
      ) : cases.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-ink-400">No cases yet.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {cases.map((c) => (
            <div key={c.id} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-brand-600">
                      Case #{c.id.slice(0, 8).toUpperCase()}
                    </span>
                    <PaymentPill status={c.paymentStatus} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{c.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {c.platform} · {c.accountHandle}
                  </p>
                  <p className="mt-2 text-xs text-ink-600">
                    {c.clientName || "Unknown client"}
                    {c.clientEmail ? ` · ${c.clientEmail}` : ""}
                  </p>
                  {c.screenshotUrl && (
                    <a
                      href={c.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block"
                      title="View error screenshot"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.screenshotUrl}
                        alt="Error screenshot"
                        className="h-20 w-32 rounded-lg border border-ink-200 object-cover shadow-sm hover:opacity-80 transition-opacity"
                      />
                      <p className="mt-1 text-[10px] font-medium text-brand-600">View screenshot →</p>
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end">
                  {!isAgent && (
                    <div className="flex flex-col items-start gap-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Agent</label>
                      <select
                        value=""
                        disabled={busyId === c.id}
                        onChange={(e) => handleAssign(c.id, e.target.value)}
                        className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500 disabled:opacity-50"
                      >
                        <option value="" disabled>
                          {c.agentName || "Unassigned"}
                        </option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                            {!a.active ? " (inactive)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-col items-start gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Stage</label>
                    <select
                      value={c.stage}
                      disabled={busyId === c.id}
                      onChange={(e) => handleStageChange(c.id, e.target.value as CaseStage)}
                      className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500 disabled:opacity-50"
                    >
                      {caseStages.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {actionError?.caseId === c.id ? (
                <p className="mt-3 rounded-lg bg-risk-high-bg px-3 py-2 text-xs font-medium text-risk-high">
                  {actionError.message}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
