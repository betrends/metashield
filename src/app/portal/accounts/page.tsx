"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { fetchAccounts, migratePendingLocalRecords, type PortalAccount } from "@/lib/portal/data";
import { BrandLoader } from "@/components/BrandLoader";

export default function PortalAccountsPage() {
  const [accounts, setAccounts] = useState<PortalAccount[] | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await migratePendingLocalRecords();
      const result = await fetchAccounts();
      if (!cancelled) setAccounts(result);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">My Accounts</h1>
          <p className="mt-1 text-sm text-ink-500">
            Every account you&apos;ve run a health check on or enrolled in
            protection. Tap an account for its full score breakdown.
          </p>
        </div>
        <ButtonLink href="/portal/accounts/new" size="sm">
          Add an Account
        </ButtonLink>
      </div>

      {accounts === "loading" ? (
        <BrandLoader label="Loading your accounts…" />
      ) : accounts.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-ink-500">You haven&apos;t added any accounts yet.</p>
          <ButtonLink href="/portal/accounts/new" size="sm">
            Run an Account Health Check
          </ButtonLink>
        </Card>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Link key={account.id} href={`/portal/accounts/${account.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{account.handle}</p>
                    <p className="mt-0.5 text-xs text-ink-400">{account.platform}</p>
                  </div>
                  <RiskBadge level={account.level} />
                </div>
                <p className="mt-4 text-2xl font-semibold text-ink-900">
                  {account.health}
                  <span className="text-sm text-ink-400">/100</span>
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-xs">
                  <span className="text-ink-400">Protection</span>
                  <span
                    className={
                      account.protectionActive
                        ? "font-semibold text-risk-low"
                        : "font-semibold text-ink-400"
                    }
                  >
                    {account.protectionActive ? "Active" : "Not enrolled"}
                  </span>
                </div>

                <p className="mt-3 text-center text-xs font-semibold text-brand-700">
                  View score breakdown →
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
