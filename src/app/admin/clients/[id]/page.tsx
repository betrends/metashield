"use client";

import { useEffect, useState } from "react";
import { PaymentStatusBadge, PaymentSummaryLine } from "@/components/portal/PaymentStatusBadge";
import type { PaymentRecord } from "@/lib/portal/payments";
import { BackLink } from "@/components/BackLink";
import { useParams } from "next/navigation";
import { getPlan, type PlanId } from "@/lib/portal/billing";

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
  }, [params.id]);

  if (detail === "unauthorized") {
    return <p className="text-sm text-ink-500">You don&apos;t have access to this page.</p>;
  }
  if (detail === "loading") {
    return <p className="text-sm text-ink-400">Loading…</p>;
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

      {/* Subscription */}
      <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Subscription</p>
        {subscription ? (
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-ink-900">{getPlan(subscription.planId).name} plan</p>
              {subscription.renewsOn ? (
                <p className="mt-0.5 text-xs text-ink-500">
                  Renews{" "}
                  {new Date(subscription.renewsOn).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              ) : null}
            </div>
            <span className="rounded-full bg-risk-low-bg px-2.5 py-1 text-xs font-semibold text-risk-low">
              Active
            </span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-500">No active subscription.</p>
        )}
      </div>

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
