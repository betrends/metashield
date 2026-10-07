"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, locales, type Locale } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/client";

const labels: Record<Locale, { short: string; name: string }> = {
  en: { short: "EN", name: "English" },
  fr: { short: "FR", name: "Français" },
};

function saveLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

// EN/FR switch for the nav bar. The choice is kept in a cookie for a year
// and the page re-renders on the server in the new language (same URL).
export function LanguageToggle({ className = "" }: { className?: string }) {
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale) {
    if (locale === current) return;
    saveLocale(locale);
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label="Language / Langue"
      className={`inline-flex items-center rounded-full border border-ink-100 bg-white p-0.5 text-xs font-semibold ${
        pending ? "opacity-60" : ""
      } ${className}`}
    >
      {locales.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            title={labels[locale].name}
            aria-pressed={active}
            disabled={pending}
            onClick={() => choose(locale)}
            className={`rounded-full px-2.5 py-1 transition-colors ${
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "text-ink-500 hover:text-brand-700"
            }`}
          >
            {labels[locale].short}
          </button>
        );
      })}
    </div>
  );
}
