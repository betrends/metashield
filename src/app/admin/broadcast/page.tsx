"use client";

// Admin → Email users: send one email to registered clients and/or form
// leads who asked to be emailed. Choose who gets it, check the preview,
// send a test to yourself, then send. Unsubscribed people and staff are
// always left out (lib/server/broadcast.ts).

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BrandLoader } from "@/components/BrandLoader";

type ClientAudience = "all" | "no_package" | "none";
type HistoryRow = {
  id: string;
  subject: string;
  audience: { clients?: ClientAudience; leads?: boolean; extraCount?: number } | null;
  status: "sending" | "done" | "stopped" | "failed";
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
};
type Info = {
  count: number;
  history: HistoryRow[];
  setupNeeded: boolean;
  sender: { ok: boolean; from: string };
  adminEmail: string;
  defaultSubject: string;
};

const clientOptions: { value: ClientAudience; label: string; hint: string }[] = [
  { value: "all", label: "All registered clients", hint: "Everyone with a MetaShield account" },
  { value: "no_package", label: "Only clients without a package", hint: "Leaves out clients who already have a package" },
  { value: "none", label: "No registered clients", hint: "" },
];

function audienceLabel(a: HistoryRow["audience"]) {
  const parts: string[] = [];
  if (a?.clients === "all") parts.push("All clients");
  if (a?.clients === "no_package") parts.push("Clients without a package");
  if (a?.leads) parts.push("Form leads");
  if (a?.extraCount) parts.push(`${a.extraCount} extra email${a.extraCount === 1 ? "" : "s"}`);
  return parts.join(" + ") || "—";
}

function newRequestId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export default function AdminBroadcastPage() {
  const [clients, setClients] = useState<ClientAudience>("all");
  const [leads, setLeads] = useState(true);
  const [subject, setSubject] = useState("");
  const [info, setInfo] = useState<Info | "loading" | "unauthorized" | "error">("loading");
  const [counting, setCounting] = useState(false);
  const [testState, setTestState] = useState<{ kind: "idle" | "busy" | "ok" | "error"; text?: string }>({ kind: "idle" });
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ kind: "ok" | "error"; text: string; resumeId?: string } | null>(null);
  const [extraText, setExtraText] = useState("");
  const [extraConsent, setExtraConsent] = useState(false);
  const [extraCheck, setExtraCheck] = useState<{ count: number; extraValid: number; invalid: string[] } | null>(null);
  const [checkingExtra, setCheckingExtra] = useState(false);
  const requestId = useRef<string>(newRequestId());
  const subjectTouched = useRef(false);

  const load = useCallback(async () => {
    setCounting(true);
    try {
      const res = await fetch(`/api/admin/broadcast?clients=${clients}&leads=${leads ? 1 : 0}`, { cache: "no-store" });
      if (res.status === 403) return setInfo("unauthorized");
      if (!res.ok) throw new Error(String(res.status));
      const data: Info = await res.json();
      setInfo(data);
      if (!subjectTouched.current) setSubject(data.defaultSubject);
    } catch {
      setInfo((prev) => (prev === "loading" ? "error" : prev));
    } finally {
      setCounting(false);
    }
  }, [clients, leads]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Pasted emails: re-count (on the server) shortly after typing stops.
  useEffect(() => {
    if (!extraText.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExtraCheck(null);
      return;
    }
    setCheckingExtra(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/broadcast", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "count", clients, leads, extra: extraText }),
        });
        const data = await res.json();
        if (!cancelled && res.ok) setExtraCheck(data);
      } catch {
        // keep the last count
      } finally {
        if (!cancelled) setCheckingExtra(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [extraText, clients, leads]);

  if (info === "loading") return <BrandLoader size="page" label="Loading…" />;
  if (info === "unauthorized") return <p className="text-sm text-ink-500">Only the admin can send emails to users.</p>;
  if (info === "error") {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-ink-900">Couldn&apos;t load this page.</p>
        <button onClick={load} className="mt-3 text-sm font-semibold text-brand-700 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const hasExtraText = extraText.trim().length > 0;
  const extraValid = extraCheck?.extraValid ?? 0;
  const count = hasExtraText && extraCheck ? extraCheck.count : info.count;
  const busyCounting = counting || (hasExtraText && checkingExtra);
  const nothingSelected = clients === "none" && !leads && extraValid === 0;
  const blocked = info.setupNeeded || !info.sender.ok;
  const needsConsent = extraValid > 0 && !extraConsent;
  const canSend = !blocked && !nothingSelected && count > 0 && !busyCounting && !sending && !needsConsent;

  async function sendTest() {
    setTestState({ kind: "busy" });
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "test", subject }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || "Couldn't send the test.");
      setTestState({ kind: "ok", text: `Test sent to ${data.sentTo}. Check your inbox (and spam folder).` });
    } catch (err) {
      setTestState({ kind: "error", text: err instanceof Error ? err.message : "Couldn't send the test." });
    }
  }

  async function post(body: Record<string, unknown>) {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setResult({ kind: "error", text: "A send is already running. Wait for it to finish, then refresh this page." });
      } else if (!res.ok) {
        setResult({
          kind: "error",
          text:
            data.error === "setup_needed"
              ? "The database setup for bulk emails hasn't been run yet."
              : data.error === "setup_needed_extra"
                ? "Nothing was sent. Run the small database update for extra emails (migration 017) in Supabase, then try again."
                : data.error === "extra_consent_required"
                  ? "Tick the box confirming the extra emails know MetaShield, then try again."
                  : "Something went wrong. Nothing more will be sent — refresh the page to see what went out.",
        });
      } else {
        const parts = [`Sent to ${data.sent} ${data.sent === 1 ? "person" : "people"}.`];
        if (data.failed) parts.push(`${data.failed} couldn't be sent.`);
        if (data.left) parts.push(`${data.left} still waiting.`);
        if (body.action === "send") {
          setExtraText(""); // so the same list isn't sent again by accident
          setExtraConsent(false);
        }
        setResult({
          kind: data.failed || data.left ? "error" : "ok",
          text: parts.join(" "),
          resumeId: data.failed || data.left ? data.broadcastId : undefined,
        });
      }
    } catch {
      setResult({ kind: "error", text: "The connection dropped. Refresh the page to see what went out before trying again." });
    } finally {
      setSending(false);
      requestId.current = newRequestId(); // the next send is a new send
      load();
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Email users</h1>
        <p className="mt-1 text-sm text-ink-500">
          Send one email to your clients, people who asked to be emailed, and any other emails you add. People who unsubscribed are always left out.
        </p>
      </div>

      {info.setupNeeded ? (
        <Notice title="One-time setup needed">
          The database tables for bulk emails aren&apos;t there yet. Run migration 016 in Supabase, then refresh this page.
        </Notice>
      ) : null}
      {!info.sender.ok ? (
        <Notice title="Set up your sending address first">
          Emails are sent from <strong>{info.sender.from || "Resend's test address"}</strong>, which only reaches your own inbox.
          Verify your domain in Resend and set RESEND_FROM_EMAIL (for example: MetaShield &lt;hello@yourdomain.com&gt;) in Vercel.
        </Notice>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-6">
          {/* 1. Who */}
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm sm:p-6">
            <StepTitle n={1} title="Who gets it" />
            <div className="mt-4 space-y-2">
              {clientOptions.map((o) => (
                <label
                  key={o.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                    clients === o.value ? "border-brand-400 bg-brand-50/60" : "border-ink-100 hover:border-ink-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="clients"
                    className="mt-1 accent-brand-600"
                    checked={clients === o.value}
                    onChange={() => setClients(o.value)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink-900">{o.label}</span>
                    {o.hint ? <span className="block text-xs text-ink-500">{o.hint}</span> : null}
                  </span>
                </label>
              ))}
            </div>
            <label
              className={`mt-3 flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                leads ? "border-brand-400 bg-brand-50/60" : "border-ink-100 hover:border-ink-200"
              }`}
            >
              <input type="checkbox" className="mt-1 accent-brand-600" checked={leads} onChange={(e) => setLeads(e.target.checked)} />
              <span>
                <span className="block text-sm font-semibold text-ink-900">Also people who filled a form</span>
                <span className="block text-xs text-ink-500">
                  Health check or eligibility check, with &ldquo;email me&rdquo; ticked. Anyone who already has a package is left out.
                </span>
              </span>
            </label>

            <div className="mt-3 rounded-xl border border-ink-100 px-4 py-3">
              <label htmlFor="extra-emails" className="block text-sm font-semibold text-ink-900">
                Add other emails <span className="font-normal text-ink-400">(optional)</span>
              </label>
              <p className="text-xs text-ink-500">For people who aren&apos;t on the platform. Paste them separated by commas, spaces or one per line.</p>
              <textarea
                id="extra-emails"
                value={extraText}
                onChange={(e) => {
                  setExtraText(e.target.value);
                  setExtraConsent(false);
                }}
                rows={4}
                placeholder={"ada@gmail.com, tunde@yahoo.com\nchioma@outlook.com"}
                className="mt-2 w-full resize-y rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              {hasExtraText ? (
                <div className="mt-2 space-y-2 text-xs">
                  <p className="text-ink-600">
                    {checkingExtra && !extraCheck ? "Checking…" : `${extraValid.toLocaleString("en-NG")} email${extraValid === 1 ? "" : "s"} added`}
                    {extraValid >= 2000 ? " (the most you can add at once)" : ""}
                  </p>
                  {extraCheck && extraCheck.invalid.length > 0 ? (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                      {extraCheck.invalid.length} {extraCheck.invalid.length === 1 ? "doesn't" : "don't"} look like an email and will be skipped:{" "}
                      <span className="break-all font-medium">{extraCheck.invalid.slice(0, 5).join(", ")}{extraCheck.invalid.length > 5 ? "…" : ""}</span>
                    </p>
                  ) : null}
                  {extraValid > 0 ? (
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-brand-50/70 px-3 py-2.5 text-ink-700">
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-brand-600"
                        checked={extraConsent}
                        onChange={(e) => setExtraConsent(e.target.checked)}
                      />
                      <span>
                        <strong className="text-ink-900">These people know MetaShield and expect to hear from us.</strong> Emailing strangers can get your
                        emails sent to spam. Anyone who unsubscribed or already has a package is skipped.
                      </span>
                    </label>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-ink-900 px-4 py-3 text-white">
              <span className="text-sm text-ink-200">This email will go to</span>
              <span className="text-lg font-bold">
                {nothingSelected ? "nobody" : busyCounting ? "…" : `${count.toLocaleString("en-NG")} ${count === 1 ? "person" : "people"}`}
              </span>
            </div>
            <p className="mt-2 text-xs text-ink-400">Each address gets it once. Staff and unsubscribed people are left out.</p>
          </section>

          {/* 2. Subject */}
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm sm:p-6">
            <StepTitle n={2} title="Subject line" />
            <input
              value={subject}
              maxLength={150}
              onChange={(e) => {
                subjectTouched.current = true;
                setSubject(e.target.value);
              }}
              className="mt-4 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <p className="mt-2 text-xs text-ink-400">The email itself is the packages announcement shown in the preview.</p>
          </section>

          {/* 3. Send */}
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm sm:p-6">
            <StepTitle n={3} title="Test, then send" />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={sendTest}
                disabled={testState.kind === "busy" || info.setupNeeded}
                className="flex-1 rounded-full border border-ink-200 px-5 py-3 text-sm font-semibold text-ink-800 transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50"
              >
                {testState.kind === "busy" ? "Sending test…" : "Send a test to me"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={!canSend}
                className="flex-1 rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700 disabled:opacity-50"
              >
                {sending ? "Sending…" : `Send to ${nothingSelected ? 0 : count.toLocaleString("en-NG")} people`}
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-400">The test goes only to {info.adminEmail}.</p>
            {needsConsent ? (
              <p className="mt-2 text-xs font-semibold text-amber-700">Tick the box under &ldquo;Add other emails&rdquo; to send.</p>
            ) : null}
            {testState.kind === "ok" || testState.kind === "error" ? (
              <p className={`mt-3 text-sm ${testState.kind === "ok" ? "text-emerald-700" : "text-risk-high"}`}>{testState.text}</p>
            ) : null}
            {sending ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
                <BrandLoader size="section" />
                Sending… keep this page open. It can take a minute for a long list.
              </div>
            ) : null}
            {result ? (
              <div
                className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                  result.kind === "ok" ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
                }`}
              >
                {result.text}
                {result.resumeId ? (
                  <button
                    type="button"
                    onClick={() => post({ action: "resume", broadcastId: result.resumeId })}
                    className="ml-2 font-semibold underline"
                  >
                    Try the rest again
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        {/* Preview */}
        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Preview</p>
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
            <div className="border-b border-ink-100 px-4 py-3">
              <p className="truncate text-sm font-semibold text-ink-900">{subject || info.defaultSubject}</p>
              <p className="text-xs text-ink-400">From {info.sender.from || "MetaShield"}</p>
            </div>
            <iframe title="Email preview" src="/api/admin/broadcast?preview=1" className="h-[640px] w-full bg-[#f5f3ff]" />
          </div>
        </aside>
      </div>

      {/* History */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink-900">Sent before</h2>
        {info.history.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">Nothing sent yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {info.history.map((h) => {
              const unfinished = h.status === "stopped" || h.status === "failed" || h.failed_count > 0;
              return (
                <div key={h.id} className="flex flex-col gap-2 rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">{h.subject}</p>
                    <p className="text-xs text-ink-500">
                      {new Date(h.created_at).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} ·{" "}
                      {audienceLabel(h.audience)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">{h.sent_count} sent</span>
                    {h.failed_count ? <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700">{h.failed_count} failed</span> : null}
                    {h.status === "sending" ? <span className="font-semibold text-brand-700">Sending…</span> : null}
                    {unfinished && h.status !== "sending" ? (
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => post({ action: "resume", broadcastId: h.id })}
                        className="font-semibold text-brand-700 hover:underline disabled:opacity-50"
                      >
                        Try the rest again
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Confirm */}
      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-lg font-bold text-ink-900">Send this email now?</p>
            <p className="mt-2 text-sm text-ink-600">
              &ldquo;{subject || info.defaultSubject}&rdquo; will go to{" "}
              <strong>
                {count.toLocaleString("en-NG")} {count === 1 ? "person" : "people"}
              </strong>
              . This can&apos;t be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  post({ action: "send", subject, clients, leads, extra: extraText, extraConsent, requestId: requestId.current });
                }}
                className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
              >
                Yes, send to {count.toLocaleString("en-NG")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{n}</span>
      <h2 className="text-base font-semibold text-ink-900">{title}</h2>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 leading-relaxed">{children}</p>
    </div>
  );
}
