"use client";

import { useT } from "@/lib/i18n/client";
export function ProgressBar({
  step,
  totalSteps,
  labels,
}: {
  step: number;
  totalSteps: number;
  labels: string[];
}) {
  const t = useT();
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-ink-900">{t("Step")}{" "}{Math.min(step + 1, totalSteps)}{" "}{t("of")}{" "}{totalSteps}
        </span>
        <span className="text-ink-500">{t(labels[step])}</span>
      </div>
      <div className="mt-3 flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-brand-600" : "bg-ink-100"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
