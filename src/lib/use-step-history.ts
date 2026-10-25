"use client";

// Makes each step of a multi-step form its own browser-history entry, so
// the phone/browser Back button goes to the previous step instead of
// leaving the page. Uses `?step=N` with the native History API, which the
// Next.js router keeps in sync.

import { useCallback, useEffect } from "react";

function readStep(): number {
  const n = Number(new URL(window.location.href).searchParams.get("step") ?? 0);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

function urlForStep(n: number): string {
  const url = new URL(window.location.href);
  if (n === 0) url.searchParams.delete("step");
  else url.searchParams.set("step", String(n));
  return url.pathname + url.search + url.hash;
}

export function useStepHistory(step: number, setStep: (n: number) => void, lastStep: number) {
  useEffect(() => {
    // A reload (or a link) can't restore the answers, so start from step 1.
    if (readStep() !== 0) window.history.replaceState(null, "", urlForStep(0));
    const onPop = () => setStep(Math.min(readStep(), lastStep));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setStep, lastStep]);

  const next = useCallback(() => {
    const n = Math.min(step + 1, lastStep);
    if (n === step) return;
    window.history.pushState(null, "", urlForStep(n));
    setStep(n);
  }, [step, setStep, lastStep]);

  const back = useCallback(() => {
    if (step === 0) return;
    // Only step back through history if the previous step is an entry we
    // pushed; otherwise just change the step.
    if (readStep() === step) window.history.back();
    else setStep(step - 1);
  }, [step, setStep]);

  const restart = useCallback(() => {
    window.history.replaceState(null, "", urlForStep(0));
    setStep(0);
  }, [setStep]);

  return { next, back, restart };
}
