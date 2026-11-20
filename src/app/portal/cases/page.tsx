"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { PaymentStatusBadge } from "@/components/portal/PaymentStatusBadge";
import { fetchCases, migratePendingLocalRecords, type PortalCase } from "@/lib/portal/data";
import { BrandLoader } from "@/components/BrandLoader";
import { recoveryWhatsappUrl } from "@/lib/site-config";

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
        Your recovery cases from before, kept for your records.
      </p>
      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-ink-700">
          <span className="font-semibold text-green-800">Recovery is now handled on WhatsApp.</span> Need an account
          recovered, or want to continue a case? Message us.
        </p>
        <a
          href={recoveryWhatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full bg-[#25D366] px-4 py-2 text-center text-sm font-bold text-white hover:bg-[#1fb957]"
        >
          WhatsApp us
        </a>
      </div>

      {cases === "loading" ? (
        <BrandLoader label="Loading your cases…" />
      ) : cases.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-ink-500">You don&apos;t have any recovery cases here.</p>
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
                  <PaymentStatusBadge payment={c.payment} />
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
