"use client";

import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { PaymentStatusBadge, PaymentSummaryLine } from "@/components/portal/PaymentStatusBadge";
import { caseStages, type CaseStage } from "@/lib/portal/mock-data";
import { formatNaira } from "@/lib/portal/case-fees";
import { documentTypeLabel } from "@/lib/portal/workflow";
import { RECOVERY_FORM_LABELS } from "@/lib/portal/recovery-form";
import type { PaymentRecord } from "@/lib/portal/payments";

type Detail = {
  role: "admin" | "agent";
  case: {
    id: string;
    userId: string;
    title: string;
    platform: string;
    accountHandle: string;
    issue: string | null;
    stage: CaseStage;
    createdAt: string;
    agentName: string | null;
    agentEmail: string | null;
    screenshotUrl: string | null;
    cancelledAt: string | null;
    cancelledBy: string | null;
    cancellationRequestedAt: string | null;
    cancellationReason: string | null;
    clientName: string | null;
    clientEmail: string | null;
    allowedNextStages: CaseStage[];
    nextAction: string;
    unreadClientMessages: number;
  };
  payment: PaymentRecord;
  receipts: { deposit: string | null; balance: string | null };
  ledger: {
    id: string;
    kind: string;
    amount_kobo: number;
    status: string;
    reference: string | null;
    note: string | null;
    submitted_at: string;
    decided_at: string | null;
    decided_by: string | null;
  }[];
  documents: {
    id: string;
    name: string;
    category: string;
    sizeBytes: number | null;
    mimeType: string | null;
    createdAt: string;
    reviewStatus: "submitted" | "approved" | "rejected";
    reviewedAt: string | null;
    reviewedBy: string | null;
    reviewNote: string | null;
    url: string | null;
  }[];
  form: { answers: Record<string, string>; form_version: string; submitted_at: string } | null;
  terms: { terms_version: string; accepted_at: string }[];
  history: {
    id: string;
    from_stage: string | null;
    to_stage: string;
    actor_role: string;
    actor: string | null;
    reason: string | null;
    is_correction: boolean;
    created_at: string;
  }[];
  timeline: { event: string; created_at: string }[];
};

function when(iso: string | null | undefined) {
  if (!iso) return "—";
  return (
    new Date(iso).toLocaleString("en-GB", {
      timeZone: "Africa/Lagos",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " WAT"
  );
}

const DOC_STATUS: Record<string, string> = {
  submitted: "bg-risk-medium-bg text-risk-medium",
  approved: "bg-risk-low-bg text-risk-low",
  rejected: "bg-risk-high-bg text-risk-high",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function AdminCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | "loading" | "forbidden" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [nextStage, setNextStage] = useState<string>("");
  const [correctStage, setCorrectStage] = useState<string>("");
  const [correctReason, setCorrectReason] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/cases/${id}`, { cache: "no-store" });
    if (res.status === 403) return setData("forbidden");
    if (!res.ok) return setData((prev) => (typeof prev === "object" ? prev : "error"));
    setData(await res.json());
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  async function post(url: string, body: unknown, success: string) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      setNotice(res.ok ? { ok: true, text: success } : { ok: false, text: json.message || json.error || "That didn't go through." });
      await load();
    } catch {
      setNotice({ ok: false, text: "Network error — nothing was changed." });
    } finally {
      setBusy(false);
    }
  }

  if (data === "loading") return <p className="text-sm text-ink-400">Loading case…</p>;
  if (data === "forbidden") return <p className="text-sm text-ink-500">You don&apos;t have access to this case.</p>;
  if (data === "error") return <p className="text-sm text-risk-high">Couldn&apos;t load this case.</p>;

  const c = data.case;
  const isAdmin = data.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <BackLink fallback="/admin/cases" className="text-sm font-semibold text-ink-500 hover:text-ink-800">
          ← Back
        </BackLink>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-brand-600">Case #{c.id.slice(0, 8).toUpperCase()}</span>
              <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-semibold text-ink-700">{c.stage}</span>
              <PaymentStatusBadge payment={data.payment} />
              {c.cancelledAt ? (
                <span className="rounded-full bg-ink-800 px-2.5 py-1 text-[11px] font-semibold text-white">Cancelled</span>
              ) : null}
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-ink-900">{c.title}</h1>
            <p className="mt-0.5 text-sm text-ink-500">
              {c.platform} · {c.accountHandle} · opened {when(c.createdAt)}
            </p>
            <p className="mt-1 text-sm text-ink-600">
              {c.clientName || "Unknown client"}
              {c.clientEmail ? ` · ${c.clientEmail}` : ""} · Agent: {c.agentName || "Unassigned"}
            </p>
          </div>
          <Link
            href={`/admin/messages?case=${c.id}`}
            className="shrink-0 rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
          >
            Messages{c.unreadClientMessages ? ` (${c.unreadClientMessages} new)` : ""}
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm">
        <span className="font-semibold text-brand-800">Next action: </span>
        <span className="text-ink-700">{c.nextAction}</span>
      </div>

      {notice ? (
        <p className={`rounded-xl px-4 py-2.5 text-sm font-medium ${notice.ok ? "bg-risk-low-bg text-risk-low" : "bg-risk-high-bg text-risk-high"}`}>
          {notice.text}
        </p>
      ) : null}

      {c.cancellationRequestedAt && !c.cancelledAt ? (
        <Section title="Cancellation requested">
          <p className="text-sm text-ink-700">
            Requested {when(c.cancellationRequestedAt)}
            {c.cancellationReason ? ` — “${c.cancellationReason}”` : ""}.
          </p>
          {isAdmin ? (
            <div className="mt-3 flex gap-2">
              <button
                disabled={busy}
                onClick={() => post("/api/admin/cases/cancellation", { caseId: c.id, decision: "approve" }, "Case cancelled.")}
                className="rounded-full bg-ink-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Approve cancellation
              </button>
              <button
                disabled={busy}
                onClick={() => post("/api/admin/cases/cancellation", { caseId: c.id, decision: "decline" }, "Request declined; case continues.")}
                className="rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 disabled:opacity-40"
              >
                Decline
              </button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-ink-500">The admin will decide this request.</p>
          )}
        </Section>
      ) : null}

      {!c.cancelledAt ? (
        <Section title="Stage">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-semibold text-ink-500">
              Move to next stage
              <select
                value={nextStage}
                onChange={(e) => setNextStage(e.target.value)}
                className="mt-1 block rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
              >
                <option value="">{c.allowedNextStages.length ? "Choose…" : "No next stage"}</option>
                {c.allowedNextStages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={busy || !nextStage}
              onClick={() => post("/api/admin/cases/advance", { caseId: c.id, stage: nextStage }, `Moved to ${nextStage}.`).then(() => setNextStage(""))}
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Move
            </button>
          </div>
          {isAdmin ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-semibold text-ink-500">Correct stage (admin, recorded with a reason)</summary>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <select
                  value={correctStage}
                  onChange={(e) => setCorrectStage(e.target.value)}
                  className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
                >
                  <option value="">Stage…</option>
                  {caseStages.filter((s) => s !== c.stage).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  value={correctReason}
                  onChange={(e) => setCorrectReason(e.target.value)}
                  placeholder="Reason for the correction"
                  className="min-w-[220px] flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm"
                />
                <button
                  disabled={busy || !correctStage || correctReason.trim().length < 5}
                  onClick={() =>
                    post(
                      "/api/admin/cases/advance",
                      { caseId: c.id, stage: correctStage, correction: true, reason: correctReason },
                      `Stage corrected to ${correctStage}.`
                    ).then(() => {
                      setCorrectStage("");
                      setCorrectReason("");
                    })
                  }
                  className="rounded-full border border-ink-300 px-4 py-2 text-sm font-semibold text-ink-800 disabled:opacity-40"
                >
                  Correct
                </button>
              </div>
            </details>
          ) : null}
        </Section>
      ) : null}

      <Section title="Payment">
        <PaymentSummaryLine payment={data.payment} />
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          {data.receipts.deposit ? (
            <a href={data.receipts.deposit} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600">
              Deposit receipt →
            </a>
          ) : null}
          {data.receipts.balance ? (
            <a href={data.receipts.balance} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600">
              Balance receipt →
            </a>
          ) : null}
          {isAdmin ? (
            <Link href="/admin/payments" className="font-semibold text-ink-500">
              Confirm or reject in Payments →
            </Link>
          ) : (
            <span className="text-ink-400">Only the admin can confirm payments.</span>
          )}
        </div>
        {data.ledger.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-ink-400">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Type</th>
                  <th className="py-1.5 pr-3 font-medium">Amount</th>
                  <th className="py-1.5 pr-3 font-medium">Status</th>
                  <th className="py-1.5 pr-3 font-medium">Reference</th>
                  <th className="py-1.5 pr-3 font-medium">Submitted</th>
                  <th className="py-1.5 font-medium">Decided</th>
                </tr>
              </thead>
              <tbody className="text-ink-700">
                {data.ledger.map((p) => (
                  <tr key={p.id} className="border-t border-ink-100">
                    <td className="py-1.5 pr-3 capitalize">{p.kind}</td>
                    <td className="py-1.5 pr-3">{formatNaira(p.amount_kobo)}</td>
                    <td className="py-1.5 pr-3">{p.status.replace("_", " ")}</td>
                    <td className="py-1.5 pr-3">{p.reference || "—"}</td>
                    <td className="py-1.5 pr-3">{when(p.submitted_at)}</td>
                    <td className="py-1.5">
                      {p.decided_at ? `${when(p.decided_at)}${p.decided_by ? ` · ${p.decided_by}` : ""}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-xs text-ink-400">No payment records yet.</p>
        )}
        <p className="mt-3 text-xs text-ink-400">
          Terms:{" "}
          {data.terms.length ? data.terms.map((t) => `version ${t.terms_version} accepted ${when(t.accepted_at)}`).join("; ") : "not accepted yet"}
        </p>
      </Section>

      <Section title="Recovery form">
        {data.form ? (
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            {Object.entries(RECOVERY_FORM_LABELS).map(([key, label]) =>
              data.form!.answers[key] ? (
                <div key={key} className="contents">
                  <dt className="text-ink-400">{label}</dt>
                  <dd className="text-ink-800">{data.form!.answers[key]}</dd>
                </div>
              ) : null
            )}
            <dt className="text-ink-400">Submitted</dt>
            <dd className="text-ink-800">{when(data.form.submitted_at)}</dd>
          </dl>
        ) : (
          <p className="text-sm text-ink-400">Not submitted yet.</p>
        )}
      </Section>

      <Section title="Documents">
        {data.documents.length === 0 ? (
          <p className="text-sm text-ink-400">No documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {data.documents.map((d) => (
              <li key={d.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">
                    {documentTypeLabel(d.category)}{" "}
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${DOC_STATUS[d.reviewStatus]}`}>{d.reviewStatus}</span>
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:underline">
                        {d.name}
                      </a>
                    ) : (
                      d.name
                    )}{" "}
                    · {d.mimeType?.split("/").pop()?.toUpperCase() ?? "file"} ·{" "}
                    {d.sizeBytes ? `${Math.round(d.sizeBytes / 1024)} KB` : "—"} · uploaded {when(d.createdAt)}
                  </p>
                  {d.reviewedAt ? (
                    <p className="text-xs text-ink-400">
                      Reviewed {when(d.reviewedAt)} by {d.reviewedBy}
                      {d.reviewNote ? ` — “${d.reviewNote}”` : ""}
                    </p>
                  ) : null}
                </div>
                {!c.cancelledAt ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      disabled={busy || d.reviewStatus === "approved"}
                      onClick={() => post("/api/admin/documents/review", { documentId: d.id, decision: "approve" }, "Document approved.")}
                      className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30"
                    >
                      Approve
                    </button>
                    <button
                      disabled={busy || d.reviewStatus === "rejected"}
                      onClick={() => {
                        const note = window.prompt("What's wrong with this document? (shown to the client)", "");
                        if (note && note.trim().length >= 3)
                          void post("/api/admin/documents/review", { documentId: d.id, decision: "reject", note }, "Document rejected; client notified.");
                      }}
                      className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 disabled:opacity-30"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {c.screenshotUrl ? (
          <p className="mt-3 text-xs">
            <a href={c.screenshotUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600">
              Screenshot from the eligibility check →
            </a>
          </p>
        ) : null}
      </Section>

      <Section title="Stage history (audit)">
        {data.history.length === 0 ? (
          <p className="text-sm text-ink-400">No recorded stage changes yet (changes are recorded from now on).</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {data.history.map((h) => (
              <li key={h.id} className="text-ink-700">
                <span className="text-xs text-ink-400">{when(h.created_at)} · </span>
                {h.from_stage ? `${h.from_stage} → ` : ""}
                <span className="font-semibold">{h.to_stage}</span>
                <span className="text-ink-500">
                  {" "}
                  by {h.actor_role}
                  {h.actor ? ` (${h.actor})` : ""}
                </span>
                {h.is_correction ? <span className="ml-1 rounded bg-risk-medium-bg px-1.5 text-[10px] font-semibold text-risk-medium">correction</span> : null}
                {h.reason ? <span className="text-ink-500"> — {h.reason}</span> : null}
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Timeline">
        <ol className="space-y-1.5 text-sm">
          {data.timeline.map((t, i) => (
            <li key={i} className="text-ink-700">
              <span className="text-xs text-ink-400">{when(t.created_at)} · </span>
              {t.event}
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
