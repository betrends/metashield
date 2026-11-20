"use client";

import { BackLink } from "@/components/BackLink";
import { RecoveryOnWhatsApp } from "@/components/RecoveryOnWhatsApp";

// New recoveries are handled on WhatsApp — the portal no longer opens cases.
export default function PortalNewCasePage() {
  return (
    <div>
      <BackLink fallback="/portal/cases" className="text-sm font-semibold text-ink-500 hover:text-ink-800">
        ← Back
      </BackLink>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold text-ink-900">Need an account recovered?</h1>
        <p className="mt-1 text-sm text-ink-500">Recovery is handled on WhatsApp. Message us and our team takes it from there.</p>
      </div>

      <div className="mx-auto mt-8 max-w-xl">
        <RecoveryOnWhatsApp />
      </div>
    </div>
  );
}
