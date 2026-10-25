"use client";

import { useEffect, useState } from "react";
import { BackLink } from "@/components/BackLink";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { fetchAccount, type PortalAccount } from "@/lib/portal/data";

export default function PortalAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const [account, setAccount] = useState<PortalAccount | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchAccount(params.id).then((result) => {
      if (!cancelled) setAccount(result);
    });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (account === undefined) {
    return <p className="text-sm text-ink-400">Loading account…</p>;
  }

  if (account === null) {
    return (
      <div>
        <BackLink fallback="/portal/accounts" className="text-sm font-semibold text-ink-500 hover:text-ink-800">
          ← Back
        </BackLink>
        <p className="mt-6 text-sm text-ink-500">
          We couldn&apos;t find that account. It may have been removed or the link may be out of date.
        </p>
      </div>
    );
  }

  const nextStepCopy =
    account.level === "high"
      ? "This account is flagged high risk. Subscribe to Account Protection so we monitor it and step in before it turns into a restriction."
      : account.level === "medium"
        ? "A few areas need review. An Account Protection plan keeps this monitored monthly instead of a one-off check."
        : "It's healthy today — an Account Protection plan keeps it that way with ongoing monitoring.";

  return (
    <div>
      <BackLink fallback="/portal/accounts" className="text-sm font-semibold text-ink-500 hover:text-ink-800">
          ← Back
        </BackLink>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{account.handle}</h1>
          <p className="mt-1 text-sm text-ink-500">{account.platform}</p>
        </div>
        <RiskBadge level={account.level} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Overall score */}
        <Card className="flex flex-col items-center justify-center text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Account health
          </p>
          <p className="mt-3 text-5xl font-semibold text-ink-900">
            {account.health}
            <span className="text-lg text-ink-400">/100</span>
          </p>
          <p className="mt-3 text-xs text-ink-500">
            Protection: {account.protectionActive ? "Active" : "Not enrolled"}
          </p>
        </Card>

        {/* Category breakdown */}
        <Card className="lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Category breakdown
          </p>
          {account.categories ? (
            <div className="mt-4 space-y-3">
              {account.categories.map((cat) => (
                <div key={cat.label} className="flex items-center justify-between border-b border-ink-100 pb-3 last:border-b-0 last:pb-0">
                  <span className="text-sm text-ink-700">{cat.label}</span>
                  <RiskBadge level={cat.level} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-500">
              No category breakdown yet — run an Account Health Check on this account to get one.
            </p>
          )}
        </Card>
      </div>

      {/* Recommended next step */}
      {!account.protectionActive ? (
        <div className="mt-6 rounded-2xl bg-brand-50 p-6">
          <p className="text-sm font-semibold text-brand-800">Recommended next step</p>
          <p className="mt-1.5 text-sm text-ink-600">{nextStepCopy}</p>
          <ButtonLink href="/portal/billing" className="mt-4">
            Subscribe to Account Protection
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-risk-low-bg p-6">
          <p className="text-sm font-semibold text-risk-low">Protection is active</p>
          <p className="mt-1.5 text-sm text-ink-600">
            We&apos;re monitoring this account monthly. You can manage or change your plan any time.
          </p>
          <ButtonLink href="/portal/billing" variant="outline" className="mt-4">
            Manage subscription
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
