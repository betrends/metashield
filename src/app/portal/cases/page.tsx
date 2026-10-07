"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { PaymentStatusBadge } from "@/components/portal/PaymentStatusBadge";
import { fetchCases, migratePendingLocalRecords, type PortalCase } from "@/lib/portal/data";

export default function PortalCasesPage() {
  const [cases, setCases] = useState<PortalCase[] | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await migratePendingLocalRecords();
      const result = await fetchCases();
      if (!cancelled) setCases(result);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Cases</h1>
      <p className="mt-1 text-sm text-ink-500">
        Every recovery case you&apos;ve opened, past and present.
      </p>

      {cases === "loading" ? (
        <p className="mt-8 text-sm text-ink-400">Loading your cases…</p>
      ) : cases.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-ink-500">You haven&apos;t opened any cases yet.</p>
          <ButtonLink href="/portal/cases/new" size="sm">
            Check Recovery Eligibility
          </ButtonLink>
        </Card>
      ) : (
        <div className="mt-8 space-y-3">
          {cases.map((c) => (
            <Link key={c.id} href={`/portal/cases/${c.id}`}>
              <Card className="flex flex-col gap-3 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-brand-700">
                    Case #{c.id.slice(0, 8).toUpperCase()}
                  </span>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{c.title}</p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {c.platform} · {c.accountHandle}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <PaymentStatusBadge status={c.paymentStatus} />
                  <span className="w-fit rounded-full bg-risk-medium-bg px-2.5 py-1 text-xs font-semibold text-risk-medium">
                    {c.stage}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
