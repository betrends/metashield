"use client";

import { BackLink } from "@/components/BackLink";
import { HealthCheckWizard } from "@/components/HealthCheckWizard";

export default function PortalNewAccountPage() {
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

      <div className="mx-auto mt-8 max-w-2xl">
        <HealthCheckWizard />
      </div>
    </div>
  );
}
