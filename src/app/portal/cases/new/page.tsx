"use client";

import { BackLink } from "@/components/BackLink";
import { EligibilityWizard } from "@/components/EligibilityWizard";

export default function PortalNewCasePage() {
  return (
    <div>
      <BackLink fallback="/portal/cases" className="text-sm font-semibold text-ink-500 hover:text-ink-800">
          ← Back
        </BackLink>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold text-ink-900">Check Recovery Eligibility</h1>
        <p className="mt-1 text-sm text-ink-500">
          A few quick questions to see if your case is a fit for recovery
          support.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-2xl">
        <EligibilityWizard />
      </div>
    </div>
  );
}
