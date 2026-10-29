"use client";

import { useEffect, useState } from "react";
import { getPlan, monthlyValueKobo, plans, type AnyPlanId as PlanId } from "@/lib/portal/billing";
import { BrandLoader } from "@/components/BrandLoader";

type Subscription = {
  id: string;
  planId: PlanId;
  status: "active" | "cancelled";
  renewsOn: string | null;
  startedAt: string;
  lifetimePaidKobo: number;
  clientName: string | null;
  clientEmail: string | null;
};

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[] | "loading" | "unauthorized">("loading");
  const [filter, setFilter] = useState<"active" | "all">("active");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/subscriptions");
      if (res.status === 403) {
        setSubs("unauthorized");
        return;
      }
      const data = await res.json();
      setSubs(data.subscriptions ?? []);
    }
    load();
  }, []);

  if (subs === "unauthorized") {
    return <p className="text-sm text-ink-500">You don&apos;t have access to this page.</p>;
  }

  const all = subs === "loading" ? [] : subs;
  const active = all.filter((s) => s.status === "active");
  // Monthly value: Annual counts 1/12 per month; Lifetime is a one-off payment.
  const mrrKobo = active.reduce((sum, s) => sum + monthlyValueKobo(getPlan(s.planId)), 0);
  const planCounts = plans.map((p) => ({
    plan: p,
    count: active.filter((s) => s.planId === p.id).length,
  }));

  const visible = subs === "loading" ? [] : filter === "all" ? all : active;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Packages</h1>
      <p className="mt-1 text-sm text-ink-500">
        Every client&apos;s MetaShield package. To switch one on after a WhatsApp or bank payment, open the client
        (Clients → client → Package).
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Active Packages</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{active.length}</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Monthly Recurring Revenue</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{formatNaira(mrrKobo)}</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">By Package</p>
          <div className="mt-2 space-y-1 text-sm">
            {planCounts.map(({ plan, count }) => (
              <div key={plan.id} className="flex justify-between">
                <span className="text-ink-600">{plan.name.replace("MetaShield ", "")}</span>
                <span className="font-semibold text-ink-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex rounded-lg border border-ink-200 p-1">
          {(["active", "all"] as const).map((f) => (
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

      <div className="mt-4 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Package</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Active until</th>
                <th className="px-5 py-3 font-medium">Lifetime Paid</th>
                <th className="px-5 py-3 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {subs === "loading" ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ink-400">
                    <BrandLoader size="inline" label="Loading…" />
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ink-400">
                    No packages {filter === "active" ? "active" : "yet"}.
                  </td>
                </tr>
              ) : (
                visible.map((s) => (
                  <tr key={s.id} className="border-b border-ink-50 last:border-b-0">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ink-900">{s.clientName || "Unknown"}</p>
                      <p className="text-xs text-ink-400">{s.clientEmail}</p>
                    </td>
                    <td className="px-5 py-3.5 text-ink-700">{getPlan(s.planId).name}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          s.status === "active" ? "bg-risk-low-bg text-risk-low" : "bg-ink-100 text-ink-500"
                        }`}
                      >
                        {s.status === "active" ? "Active" : "Cancelled"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-ink-600">
                      {s.renewsOn
                        ? new Date(s.renewsOn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : s.planId === "lifetime"
                          ? "Lifetime"
                          : "—"}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-ink-900">{formatNaira(s.lifetimePaidKobo)}</td>
                    <td className="px-5 py-3.5 text-ink-400">
                      {new Date(s.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
