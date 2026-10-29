"use client";

// The MetaShield packages as cards (lib/portal/billing.ts), used on the
// pricing page, the Account Protection page and the client Packages page.
// "Get this package" goes to Korapay's payment page (lib/portal/
// start-package.ts); it falls back to WhatsApp if card payment isn't set up.

import { useRef, useState } from "react";
import { PACKAGES_DISCLAIMER, plans, type Plan } from "@/lib/portal/billing";
import { packageWhatsAppUrl, startPackageCheckout } from "@/lib/portal/start-package";

type Props = { mode: "public" } | { mode: "portal"; currentPlanId: string | null };

const periodLabel: Record<Plan["period"], string> = { month: "per month", year: "per year", lifetime: "one-time payment" };

export function PackagesGrid(props: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorFor, setErrorFor] = useState<{ id: string; message: string } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Phones: which card is in view (for the dots under the swipe row).
  function onScroll() {
    const row = rowRef.current;
    const first = row?.firstElementChild as HTMLElement | null;
    if (!row || !first) return;
    const step = first.offsetWidth + 16; // card width + gap
    setActive(Math.max(0, Math.min(plans.length - 1, Math.round(row.scrollLeft / step))));
  }
  async function getPackage(plan: Plan) {
    setErrorFor(null);
    setBusyId(String(plan.id));
    const message = await startPackageCheckout(plan);
    if (message) {
      setErrorFor({ id: String(plan.id), message });
      setBusyId(null);
    }
    // Otherwise the page is moving on; keep the button busy.
  }
  function goTo(i: number) {
    const row = rowRef.current;
    const target = row?.children[i] as HTMLElement | undefined;
    if (row && target) row.scrollTo({ left: target.offsetLeft - row.offsetLeft - 16, behavior: "smooth" });
  }

  return (
    <div>
      {/* Phones: swipe sideways between the cards. Tablets: 2 per row. Computers: all 4 in a row. */}
      <div
        ref={rowRef}
        onScroll={onScroll}
        className="-mx-4 flex items-start snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:items-stretch [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden"
      >
        {plans.map((plan) => {
          const isCurrent = props.mode === "portal" && props.currentPlanId === plan.id;
          const badge = isCurrent ? "Your package" : plan.period === "year" ? "Yearly" : plan.period === "lifetime" ? "Pay once" : "Monthly";
          return (
            <article
              key={plan.id}
              className={`flex w-[85%] shrink-0 snap-center flex-col rounded-2xl border bg-white p-6 shadow-sm sm:w-auto ${
                isCurrent ? "border-brand-500 ring-2 ring-brand-500" : "border-ink-100"
              }`}
            >
              {/* Name + badge */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold uppercase tracking-wide text-ink-900">{plan.name.replace("MetaShield ", "")}</p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    isCurrent ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                  }`}
                >
                  {badge}
                </span>
              </div>

              {/* Price, with the period on its own line so every card lines up */}
              <p className="mt-4 text-3xl font-bold tracking-tight text-ink-900">{plan.price}</p>
              <p className="text-sm text-ink-500">{periodLabel[plan.period]}</p>

              {/* Headline (always two lines tall so the lists start level) */}
              <p className="mt-3 min-h-[2.5rem] text-xs font-bold uppercase leading-5 tracking-wide text-brand-700">{plan.tagline}</p>

              <div className="my-5 border-t border-ink-100" />

              <ul className="flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm leading-snug text-ink-600">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {plan.note ? <p className="mt-5 rounded-xl bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-500">{plan.note}</p> : null}
              <div className="mt-5">
                <PackageButton
                  plan={plan}
                  isCurrent={isCurrent}
                  busy={busyId === plan.id}
                  disabled={busyId !== null}
                  onClick={() => getPackage(plan)}
                />
                {errorFor?.id === plan.id ? (
                  <p className="mt-2 text-xs text-risk-high">
                    {errorFor.message}{" "}
                    <a href={packageWhatsAppUrl(plan)} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                      WhatsApp
                    </a>
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {/* Phones: dots + hint */}
      <div className="mt-3 flex flex-col items-center gap-2 sm:hidden">
        <div className="flex gap-2">
          {plans.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Show ${p.name}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-brand-600" : "w-2 bg-ink-200"}`}
            />
          ))}
        </div>
        <p className="text-xs text-ink-400">Swipe to see all {plans.length} packages</p>
      </div>

      <p className="mx-auto mt-8 max-w-3xl rounded-2xl border border-brand-100 bg-brand-50/60 px-5 py-4 text-center text-xs leading-relaxed text-ink-600">
        <strong className="text-ink-900">Important:</strong> {PACKAGES_DISCLAIMER.replace(/^Important: /, "")}
      </p>
    </div>
  );
}

function PackageButton({
  plan,
  isCurrent,
  busy,
  disabled,
  onClick,
}: {
  plan: Plan;
  isCurrent: boolean;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const base = "flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition";
  if (isCurrent) {
    return <span className={`${base} bg-ink-50 text-ink-500 ring-1 ring-ink-200`}>Current package</span>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Get the ${plan.name} package`}
      className={`${base} bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60`}
    >
      {busy ? "Opening payment…" : "Get this package"}
    </button>
  );
}
