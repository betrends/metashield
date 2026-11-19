"use client";

// Opens the Instagram app from the protection checklist email
// (lib/instagram-links.ts) and shows what to tap for that step.

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { INSTAGRAM_STEPS, IG_APP_IOS, igAppAndroid, isInstagramStep } from "@/lib/instagram-links";

export default function OpenInstagramPage() {
  return (
    <Suspense fallback={null}>
      <OpenInstagram />
    </Suspense>
  );
}

function OpenInstagram() {
  const params = useSearchParams();
  const stepParam = params.get("step");
  const step = INSTAGRAM_STEPS[isInstagramStep(stepParam) ? stepParam : "center"];
  const [appLink, setAppLink] = useState(IG_APP_IOS);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const android = /android/i.test(navigator.userAgent);
    const link = android ? igAppAndroid(step.web) : IG_APP_IOS;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppLink(link);
    // Phones: open the app straight away.
    if (/android|iphone|ipad|ipod/i.test(navigator.userAgent)) {
      window.location.href = link;
    }
    const t = setTimeout(() => setTried(true), 1200);
    return () => clearTimeout(t);
  }, [step.web]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-brand-100 bg-white p-6 text-center shadow-xl shadow-brand-900/10 sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-lg">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
            <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
          </svg>
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-wider text-brand-600">MetaShield · Account protection</p>
        <h1 className="mt-1 text-xl font-bold text-ink-900">{step.title}</h1>
        <p className="mt-2 text-sm text-ink-500">{tried ? "Instagram should have opened. If it didn't, tap the button below." : "Opening the Instagram app…"}</p>

        <a
          href={appLink}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#dd2a7b] to-[#8134af] px-5 py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-95"
        >
          Open the Instagram app →
        </a>

        <div className="mt-6 rounded-2xl bg-brand-50 p-4 text-left ring-1 ring-brand-100">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-700">In the app, tap:</p>
          <ol className="mt-2 space-y-1.5">
            {step.path.map((p, i) => (
              <li key={p} className="flex items-center gap-2.5 text-sm text-ink-800">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>
                {p}
              </li>
            ))}
          </ol>
          {step.tip ? <p className="mt-3 border-t border-brand-100 pt-3 text-sm text-ink-600">{step.tip}</p> : null}
        </div>

        <a href={step.web} className="mt-5 inline-block text-xs font-semibold text-ink-500 underline hover:text-brand-700">
          {step.webLabel ?? "No Instagram app? Open it in the browser instead"}
        </a>
      </div>
    </main>
  );
}
