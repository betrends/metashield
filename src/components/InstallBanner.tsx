"use client";

import { useT } from "@/lib/i18n/client";
import { useEffect, useState } from "react";

// Android Chrome fires a `beforeinstallprompt` event when the PWA is
// installable. We capture it and show our own branded banner instead of
// the default browser mini-infobar. iOS gets a separate hint since it
// doesn't support the event — users tap Share → "Add to Home Screen".

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallBanner() {
  const t = useT();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Already installed or in standalone mode — don't show
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Dismissed this session
    if (sessionStorage.getItem("pwa-banner-dismissed")) {
      setDismissed(true);
      return;
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIos(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("pwa-banner-dismissed", "1");
    setDismissed(true);
    setDeferredPrompt(null);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDismissed(true);
    setDeferredPrompt(null);
  };

  if (dismissed || isStandalone) return null;

  // Android — show install button when prompt is ready
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-2xl bg-ink-900 px-4 py-3 shadow-xl sm:left-auto sm:right-4 sm:max-w-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-lg">🛡️</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{t("Add to Home Screen")}</p>
          <p className="text-xs text-ink-400">{t("Open MetaShield like an app")}</p>
        </div>
        <button
          onClick={install}
          className="shrink-0 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700"
        >{t("Install")}</button>
        <button onClick={dismiss} className="text-ink-500 hover:text-white" aria-label={t("Dismiss")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  // iOS — passive hint (can't trigger install programmatically)
  if (isIos) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 flex items-start gap-3 rounded-2xl bg-ink-900 px-4 py-3 shadow-xl sm:left-auto sm:right-4 sm:max-w-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-lg">🛡️</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{t("Install MetaShield")}</p>
          <p className="text-xs text-ink-400">{t("Tap")}{" "}
            <span className="inline-flex items-center gap-0.5 font-medium text-ink-300">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="inline">
                <path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>{" "}{t("Share")}</span>{" "}{t("then")}{" "}<span className="font-medium text-ink-300">{t("\"Add to Home Screen\"")}</span>
          </p>
        </div>
        <button onClick={dismiss} className="mt-0.5 text-ink-500 hover:text-white" aria-label={t("Dismiss")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  return null;
}
