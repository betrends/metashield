"use client";

import { useT } from "@/lib/i18n/client";
import { contact, recoveryWhatsappUrl } from "@/lib/site-config";

// Account recovery is handled on WhatsApp. This card replaces the old
// recovery forms (eligibility checker, "new case") wherever someone would
// have started a recovery on the website.
export function RecoveryOnWhatsApp({ hasPackage = false }: { hasPackage?: boolean }) {
  const t = useT();
  const steps = [
    { title: t("Message us on WhatsApp"), text: t("Tell us which account it is and what happened.") },
    { title: t("Send what you have"), text: t("Screenshots of any message from Meta help us move faster.") },
    {
      title: t("We handle the recovery"),
      text: hasPackage
        ? t("Your package covers it — no recovery fee for covered accounts.")
        : t("We tell you the fee before anything starts. With a MetaShield package, there's no recovery fee."),
    },
  ];

  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md shadow-green-600/25">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm4.52 11.99c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
          </svg>
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-green-700">{t("Account recovery")}</p>
          <h2 className="text-xl font-bold text-ink-900">{t("Recovery happens on WhatsApp")}</h2>
        </div>
      </div>

      <ol className="mt-6 space-y-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">{s.title}</p>
              <p className="mt-0.5 text-sm text-ink-500">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <a
        href={recoveryWhatsappUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3.5 text-base font-bold text-white shadow-md shadow-green-600/25 transition hover:bg-[#1fb957]"
      >
        {t("Start recovery on WhatsApp")} →
      </a>
      <p className="mt-3 text-center text-xs text-ink-500">
        {t("WhatsApp")} {contact.inquiriesWhatsappDisplay} · {t("We will never ask for your password.")}
      </p>
    </div>
  );
}
