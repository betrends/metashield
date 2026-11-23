"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { protectHealthCheck, type PortalHealthCheck } from "@/lib/portal/data";

// Every health check the client has run (before or after signing up), newest
// first. With a package, "Add for protection" turns a check into a protected
// account (if the package covers it). Without one, it leads to the 2-week
// free trial.
export function HealthCheckHistory({
  checks,
  accounts = [],
  hasPackage,
  onProtected,
  limit,
}: {
  checks: PortalHealthCheck[];
  accounts?: { id: string; handle: string; platform: string }[];
  hasPackage: boolean;
  onProtected: () => void;
  limit?: number;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shown = limit ? checks.slice(0, limit) : checks;

  async function protect(check: PortalHealthCheck) {
    setError(null);
    setBusyId(check.id);
    const result = await protectHealthCheck(check);
    setBusyId(null);
    if (result.ok) onProtected();
    else setError(result.message);
  }

  if (checks.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Health check history</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            {hasPackage
              ? "Every check you've run. Add an account for protection to have it watched."
              : "Every check you've run is kept here. Choose a package to protect these accounts."}
          </p>
        </div>
        {limit && checks.length > limit ? (
          <Link href="/portal/accounts#history" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
            See all ({checks.length})
          </Link>
        ) : null}
      </div>
      <Card className="mt-4 divide-y divide-ink-100 p-0">
        {shown.map((check) => {
          // Already protected: linked to this check, or the same account.
          const norm = (h: string) => h.trim().replace(/^@/, "").toLowerCase();
          const protectedId =
            check.accountId ??
            accounts.find((a) => norm(a.handle) === norm(check.handle) && a.platform.toLowerCase() === check.platform.toLowerCase())
              ?.id ??
            null;
          const color =
            check.health >= 70 ? "text-risk-low" : check.health >= 50 ? "text-risk-medium" : "text-risk-high";
          return (
            <div key={check.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {check.handle} <span className="font-normal text-ink-500">· {check.platform}</span>
                </p>
                <p className="text-xs text-ink-500">
                  Checked{" "}
                  {new Date(check.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <p className={`shrink-0 text-sm font-semibold ${color}`}>
                {check.health}
                <span className="font-normal text-ink-400">/100</span>
              </p>
              {protectedId ? (
                <Link
                  href={`/portal/accounts/${protectedId}`}
                  className="shrink-0 rounded-full bg-risk-low-bg px-2.5 py-1 text-xs font-semibold text-risk-low ring-1 ring-risk-low/30"
                >
                  Protected
                </Link>
              ) : hasPackage ? (
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => protect(check)}
                  className="shrink-0 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:text-sm"
                >
                  {busyId === check.id ? "Adding…" : "Add for protection"}
                </button>
              ) : (
                <Link
                  href="/portal/billing"
                  className="shrink-0 rounded-xl border border-ink-200 px-3.5 py-2 text-xs font-semibold text-ink-900 transition-colors hover:border-brand-400 sm:text-sm"
                >
                  Protect it
                </Link>
              )}
            </div>
          );
        })}
      </Card>
      {error ? <p className="mt-2 text-sm font-medium text-risk-high">{error}</p> : null}
    </div>
  );
}
