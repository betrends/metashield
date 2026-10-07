"use client";

import { useT } from "@/lib/i18n/client";
import { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";

export function PricingCard({
  name,
  price,
  priceSuffix,
  description,
  features,
  cta,
  ctaHref,
  highlighted = false,
}: {
  name: string;
  price: string;
  priceSuffix?: string;
  description: string;
  features: ReactNode[];
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
}) {
  const t = useT();
  return (
    <div
      className={`flex flex-col rounded-2xl p-7 transition-transform duration-200 hover:-translate-y-1 ${
        highlighted
          ? "bg-ink-900 text-white shadow-lg shadow-ink-900/20 ring-1 ring-ink-900"
          : "border border-ink-100 bg-white"
      }`}
    >
      {highlighted ? (
        <span className="mb-4 inline-flex w-fit items-center rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-300">{t("Most popular")}</span>
      ) : null}
      <h3
        className={`text-lg font-semibold ${highlighted ? "text-white" : "text-ink-900"}`}
      >
        {t(name)}
      </h3>
      <p
        className={`mt-1.5 text-sm ${highlighted ? "text-ink-300" : "text-ink-500"}`}
      >
        {t(description)}
      </p>
      <div className="mt-5 flex items-baseline gap-1.5">
        <span
          className={`text-3xl font-semibold tracking-tight ${highlighted ? "text-white" : "text-ink-900"}`}
        >
          {t(price)}
        </span>
        {priceSuffix ? (
          <span
            className={`text-sm ${highlighted ? "text-ink-300" : "text-ink-500"}`}
          >
            {t(priceSuffix)}
          </span>
        ) : null}
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <svg
              className={`mt-0.5 h-4 w-4 shrink-0 ${highlighted ? "text-brand-400" : "text-brand-600"}`}
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
            <span className={highlighted ? "text-ink-200" : "text-ink-600"}>
              {typeof feature === "string" ? t(feature) : feature}
            </span>
          </li>
        ))}
      </ul>
      <ButtonLink
        href={ctaHref}
        variant={highlighted ? "primary" : "outline"}
        className="mt-7 w-full"
      >
        {t(cta)}
      </ButtonLink>
    </div>
  );
}
