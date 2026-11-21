"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";

// Home page hero: what a protected account looks like inside MetaShield.
// One orchestrated moment on load — the protection steps tick off one by one
// and the health score climbs with them (the same rule as the portal: all
// steps done = 95). Reduced-motion visitors see the finished state.
const STEPS = [
  "Verification selfie added",
  "Date of birth confirmed",
  "Unknown devices logged out",
  "Two-factor authentication on",
];
const START = 62;
const END = 95;

export function HeroProtectionPanel() {
  const t = useT();
  const [done, setDone] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timers = reduce
      ? [window.setTimeout(() => setDone(STEPS.length), 0)]
      : STEPS.map((_, i) => window.setTimeout(() => setDone(i + 1), 700 + i * 650));
    return () => timers.forEach(clearTimeout);
  }, []);

  const score = Math.round(START + ((END - START) * done) / STEPS.length);
  const radius = 52;
  const circ = 2 * Math.PI * radius;

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="rounded-[28px] border border-ink-200/70 bg-white p-6 shadow-[0_30px_60px_-30px_rgba(23,22,42,0.25)] sm:p-7">
        {/* Account */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
              </svg>
            </span>
            <div>
              <p className="text-[15px] font-semibold text-ink-900">@yourbusiness</p>
              <p className="text-xs text-ink-500">{t("Instagram · Business account")}</p>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-500 ${
              done === STEPS.length ? "bg-risk-low-bg text-risk-low" : "bg-ink-100 text-ink-600"
            }`}
          >
            {done === STEPS.length ? t("Protected") : t("Securing…")}
          </span>
        </div>

        {/* Score */}
        <div className="mt-7 flex items-center gap-6">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--color-ink-100)" strokeWidth="9" />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={done === STEPS.length ? "var(--color-risk-low)" : "var(--color-brand-600)"}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - score / 100)}
                style={{ transition: "stroke-dashoffset 600ms cubic-bezier(.2,.8,.2,1), stroke 500ms" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-serif text-[2.6rem] leading-none text-ink-900 tabular-nums" aria-live="polite">
                {score}
              </span>
              <span className="mt-1 text-[11px] text-ink-500">{t("account health")}</span>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-ink-600">
            {t("Every step you complete closes a gap Meta's systems look for — and raises your score.")}
          </p>
        </div>

        {/* Steps */}
        <ul className="mt-6 space-y-2.5">
          {STEPS.map((s, i) => {
            const isDone = i < done;
            return (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                    isDone ? "bg-risk-low text-white" : "border border-ink-200 text-transparent"
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className={`transition-colors duration-300 ${isDone ? "text-ink-900" : "text-ink-400"}`}>{t(s)}</span>
              </li>
            );
          })}
        </ul>

        {/* Recovery */}
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-ink-50 px-4 py-3">
          <p className="text-sm text-ink-700">{t("If it's ever suspended or disabled")}</p>
          <p className="text-sm font-semibold text-ink-900">{t("Recovery included")}</p>
        </div>
      </div>
    </div>
  );
}
