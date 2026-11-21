"use client";

import { useEffect, useState } from "react";
import { BackLink } from "@/components/BackLink";
import { HealthCheckWizard } from "@/components/HealthCheckWizard";
import { AccountAllowance } from "@/components/portal/AccountAllowance";
import { fetchAccounts, type PortalAccount } from "@/lib/portal/data";
import { fetchSubscription, type ClientSubscription } from "@/lib/portal/subscriptions";

export default function PortalNewAccountPage() {
  const [allowance, setAllowance] = useState<{ accounts: PortalAccount[]; sub: ClientSubscription | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAccounts(), fetchSubscription().catch(() => null)])
      .then(([accounts, sub]) => {
        if (!cancelled) setAllowance({ accounts, sub });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <BackLink fallback="/portal/accounts" className="text-sm font-semibold text-ink-500 hover:text-ink-800">
          ← Back
        </BackLink>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold text-ink-900">Add an Account</h1>
        <p className="mt-1 text-sm text-ink-500">
          Four short steps to a preliminary risk assessment for another
          account, reviewed by our team.
        </p>
      </div>

      {allowance ? (
        <div className="mx-auto mt-6 max-w-2xl">
          <AccountAllowance accounts={allowance.accounts} subscription={allowance.sub} />
        </div>
      ) : null}

      <div className="mx-auto mt-8 max-w-2xl">
        <HealthCheckWizard />
      </div>
    </div>
  );
}
