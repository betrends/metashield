"use client";

import { useEffect, useState } from "react";
import { formatNaira } from "@/lib/portal/case-fees";
import { BrandLoader } from "@/components/BrandLoader";

type Report = {
  months: { key: string; label: string; requests: number; revenueKobo: number }[];
  platformBreakdown: { platform: string; count: number }[];
  issueBreakdown: { issue: string; count: number }[];
  totals: { totalRequests: number; totalRevenueKobo: number };
};

export default function AdminReportsPage() {
  const [data, setData] = useState<Report | "loading" | "unauthorized">("loading");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/reports");
      if (res.status === 403) {
        setData("unauthorized");
        return;
      }
      setData(await res.json());
    }
    load();
  }, []);

  if (data === "unauthorized") {
    return <p className="text-sm text-ink-500">You don&apos;t have access to this page.</p>;
  }
  if (data === "loading") {
    return <BrandLoader label="Loading…" />;
  }

  const maxMonthRequests = Math.max(1, ...data.months.map((m) => m.requests));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Reports</h1>
      <p className="mt-1 text-sm text-ink-500">Requests and revenue over the last 6 months.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Total Requests (all time)</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{data.totals.totalRequests}</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Total Revenue (all time)</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{formatNaira(data.totals.totalRevenueKobo)}</p>
        </div>
      </div>

      {/* Monthly bar chart */}
      <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-ink-900">Requests by Month</h2>
        <div className="mt-6 flex items-end gap-4" style={{ height: 160 }}>
          {data.months.map((m) => (
            <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end">
                <div
                  className="w-full rounded-t-md bg-brand-500"
                  style={{ height: `${Math.max((m.requests / maxMonthRequests) * 100, m.requests > 0 ? 6 : 0)}%` }}
                  title={`${m.requests} requests`}
                />
              </div>
              <span className="text-xs text-ink-500">{m.label}</span>
              <span className="text-xs font-semibold text-ink-900">{m.requests}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly revenue table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-5 py-3 font-medium">Month</th>
                <th className="px-5 py-3 font-medium">Requests</th>
                <th className="px-5 py-3 font-medium">Confirmed Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((m) => (
                <tr key={m.key} className="border-b border-ink-50 last:border-b-0">
                  <td className="px-5 py-3.5 font-medium text-ink-900">{m.label}</td>
                  <td className="px-5 py-3.5 text-ink-600">{m.requests}</td>
                  <td className="px-5 py-3.5 text-ink-600">{formatNaira(m.revenueKobo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          <h2 className="px-5 pt-5 text-base font-semibold text-ink-900">By Platform</h2>
          <table className="mt-3 w-full text-left text-sm">
            <tbody>
              {data.platformBreakdown.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-center text-ink-400">No requests yet.</td>
                </tr>
              ) : (
                data.platformBreakdown.map((p) => (
                  <tr key={p.platform} className="border-t border-ink-50">
                    <td className="px-5 py-3 text-ink-700">{p.platform}</td>
                    <td className="px-5 py-3 text-right font-semibold text-ink-900">{p.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          <h2 className="px-5 pt-5 text-base font-semibold text-ink-900">By Issue Type</h2>
          <table className="mt-3 w-full text-left text-sm">
            <tbody>
              {data.issueBreakdown.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-center text-ink-400">No requests yet.</td>
                </tr>
              ) : (
                data.issueBreakdown.map((i) => (
                  <tr key={i.issue} className="border-t border-ink-50">
                    <td className="px-5 py-3 text-ink-700">{i.issue}</td>
                    <td className="px-5 py-3 text-right font-semibold text-ink-900">{i.count}</td>
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
