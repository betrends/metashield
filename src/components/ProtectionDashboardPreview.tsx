"use client";

import { useT } from "@/lib/i18n/client";
import { Card } from "@/components/ui/Card";
import { RiskBadge } from "@/components/ui/RiskBadge";

const recommendedActions = [
  "Review account security",
  "Enable two-factor authentication",
  "Review connected apps",
  "Review active administrators",
  "Review recent policy warnings",
];

// Illustrative sample of the Protection Program dashboard.
export function ProtectionDashboardPreview() {
  const t = useT();
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex flex-col gap-6 p-7 sm:flex-row sm:items-center sm:justify-between border-b border-ink-100">
        <div>
          <p className="text-sm text-ink-500">{t("Your account is currently being monitored.")}</p>
          <p className="mt-1 text-lg font-semibold text-ink-900">{t("Current status")}</p>
        </div>
        <RiskBadge level="low" />
      </div>
      <div className="grid gap-8 p-7 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{t("Risk alerts")}</p>
          <ul className="mt-3 space-y-2.5 text-sm text-ink-600">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-risk-low" />{t("No recent restriction detected")}</li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-risk-medium" />{t("Security review recommended")}</li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-risk-high" />{t("Advertising activity requires review")}</li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{t("Recommended actions")}</p>
          <ul className="mt-3 space-y-2.5">
            {recommendedActions.map((action) => (
              <li key={action} className="flex items-start gap-2.5 text-sm text-ink-600">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="m5 13 4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t(action)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
