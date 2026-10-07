"use client";

import { useT } from "@/lib/i18n/client";

export type RiskLevel = "low" | "medium" | "high";

const riskConfig: Record<
  RiskLevel,
  { label: string; dot: string; text: string; bg: string }
> = {
  low: {
    label: "Healthy",
    dot: "bg-risk-low",
    text: "text-risk-low",
    bg: "bg-risk-low-bg",
  },
  medium: {
    label: "Review",
    dot: "bg-risk-medium",
    text: "text-risk-medium",
    bg: "bg-risk-medium-bg",
  },
  high: {
    label: "High risk",
    dot: "bg-risk-high",
    text: "text-risk-high",
    bg: "bg-risk-high-bg",
  },
};

export function RiskBadge({
  level,
  label,
}: {
  level: RiskLevel;
  label?: string;
}) {
  const t = useT();
  const config = riskConfig[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.bg} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {t(label ?? config.label)}
    </span>
  );
}
