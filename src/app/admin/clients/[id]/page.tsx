"use client";

import { useEffect, useState } from "react";
import { PaymentStatusBadge, PaymentSummaryLine } from "@/components/portal/PaymentStatusBadge";
import type { PaymentRecord } from "@/lib/portal/payments";
import { BackLink } from "@/components/BackLink";
import { useParams } from "next/navigation";
import { getPlan, isPlanId, plans, type AnyPlanId as PlanId } from "@/lib/portal/billing";
import { BrandLoader } from "@/components/BrandLoader";

type Detail = {
  client: { id: string; name: string | null; email: string | null; phone: string | null; joinedAt: string };
  accounts: {
    id: string;
    handle: string;
    platform: string;
    health: number;
    level: "low" | "medium" | "high";
    protectionActive: boolean;
    createdAt: string;
  }[];
  cases: {
    id: string;
    title: string;
    platform: string;
    stage: string;
    paymentStatus: "unpaid" | "pending_review" | "paid" | "failed";
    payment: PaymentRecord;
    feeAmountKobo: number | null;
    agentName: string | null;
    createdAt: string;
  }[];
  subscription: { planId: PlanId; status: string; renewsOn: string | null } | null;
};

function LevelPill({ level }: { level: "low" | "medium" | "high" }) {
  const styles = {
    low: "bg-risk-low-bg text-risk-low",
    medium: "bg-risk-medium-bg text-risk-medium",
    high: "bg-risk-high-bg text-risk-high",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[level]}`}>
      {level === "low" ? "Healthy" : level === "medium" ? "Review" : "High risk"}
    </span>
  );
}

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

export default function AdminClientDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null | "loading" | "unauthorized">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/clients/${params.id}`);
      if (res.status === 403) {
        setDetail("unauthorized");
        return;
      }
      if (!res.ok) {
        setDetail(null);
        return;
      }
      const data = await res.json();
      setDetail(data);
    }
    load();
  }, [params.id, reloadKey]);

  if (detail === "unauthorized") {
    return <p className="text-sm text-ink-500">You don&apos;t have access to this page.</p>;
  }
  if (detail === "loading") {
    return <BrandLoader label="Loading…" />;
  }
  if (detail === null) {
    return (
      <div>
        <BackLink fallback="/admin/clients" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
          ← Back
        </BackLink>
        <p className="mt-6 text-sm text-ink-400">Client not found.</p>
      </div>
    );
  }

  const { client, accounts, cases, subscription } = detail;

  return (
    <div>
      <BackLink fallback="/admin/clients" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
          ← Back
        </BackLink>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{client.name || "Unnamed client"}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {client.email}
            {client.phone ? ` · ${client.phone}` : ""}
          </p>
        </div>
        <p className="text-xs text-ink-400">
          Joined{" "}
          {new Date(client.joinedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Package */}
      <PackageManager
        userId={client.id}
        subscription={subscription}
        onChanged={() => setReloadKey((k) => k + 1)}
      />

      {/* Accounts */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-ink-900">Accounts ({accounts.length})</h2>
        {accounts.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">No accounts on file.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-5 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">{a.handle}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{a.platform}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-ink-900">{a.health}/100</span>
                  <LevelPill level={a.level} />
                  {a.protectionActive ? (
                    <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                      Protected
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cases */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-ink-900">Cases ({cases.length})</h2>
        {cases.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">No cases on file.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {cases.map((c) => (
              <div key={c.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink-900">{c.title}</p>
                  <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-semibold text-ink-600">
                    {c.stage}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-ink-500">
                  {c.platform} · Agent: {c.agentName || "—"}
                  {c.feeAmountKobo ? ` · Fee: ${formatNaira(c.feeAmountKobo)}` : ""}
                </p>
                <div className="mt-2">
                  <PaymentStatusBadge payment={c.payment} />
                </div>
                <PaymentSummaryLine payment={c.payment} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Shows the client's MetaShield package and lets the admin switch one on
// after the client pays outside card checkout (WhatsApp / bank transfer).
function PackageManager({
  userId,
  subscription,
  onChanged,
}: {
  userId: string;
  subscription: Detail["subscription"];
  onChanged: () => void;
}) {
  const [planId, setPlanId] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const current = subscription ? getPlan(subscription.planId) : null;
  const expired = !!subscription?.renewsOn && new Date(subscription.renewsOn).getTime() < Date.now() - 864e5;
  const chosen = plans.find((p) => p.id === planId) ?? null;

  async function send(body: Record<string, unknown>, success: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/subscriptions/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || "Couldn't update the package.");
      setMessage({ ok: true, text: success });
      setPlanId("");
      setNote("");
      onChanged();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't update the package." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Package</p>
      {subscription && current ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-ink-900">{current.name}</p>
            <p className="mt-0.5 text-xs text-ink-500">
              {subscription.renewsOn
                ? `${expired ? "Ended" : "Active until"} ${new Date(subscription.renewsOn).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}`
                : "Lifetime — never ends"}
              {isPlanId(subscription.planId) ? "" : " · old plan (no free recovery)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                expired ? "bg-ink-100 text-ink-500" : "bg-risk-low-bg text-risk-low"
              }`}
            >
              {expired ? "Ended" : "Active"}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Switch off ${current.name} for this client?`)) void send({ action: "end" }, "Package switched off.");
              }}
              className="text-xs font-semibold text-ink-400 hover:text-risk-high disabled:opacity-50"
            >
              Switch off
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink-500">No active package.</p>
      )}

      <div className="mt-5 border-t border-ink-100 pt-5">
        <p className="text-sm font-semibold text-ink-900">{subscription ? "Change or renew package" : "Activate a package"}</p>
        <p className="mt-0.5 text-xs text-ink-500">
          Use this after the client has paid you (WhatsApp / bank transfer). It records the payment and emails the client.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500 sm:w-64"
          >
            <option value="">Choose package…</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.price}
                {p.period === "lifetime" ? " one-time" : p.priceSuffix}
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Payment note, e.g. bank reference (optional)"
            className="min-w-0 flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <button
            type="button"
            disabled={!chosen || busy}
            onClick={() => {
              if (!chosen) return;
              if (window.confirm(`Activate ${chosen.name} (${chosen.price}) for this client and record the payment?`)) {
                void send({ planId: chosen.id, note }, `${chosen.name} is now active.`);
              }
            }}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Activate"}
          </button>
        </div>
        {message ? (
          <p className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${message.ok ? "bg-risk-low-bg text-risk-low" : "bg-risk-high-bg text-risk-high"}`}>
            {message.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
