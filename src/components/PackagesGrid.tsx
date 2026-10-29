"use client";

// The MetaShield packages as cards (lib/portal/billing.ts), used on the
// pricing page, the Account Protection page and the client Packages page.
// "Get this package" goes to Korapay's payment page (lib/portal/
// start-package.ts); it falls back to WhatsApp if card payment isn't set up.
//
// Look: each package has its own icon and colour, Elite is the featured
// dark card with a moving glow border, cards rise in one after another when
// they scroll into view and lift on hover. Animations switch off for people
// who ask their device for reduced motion (globals.css, "Package cards").

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PACKAGES_DISCLAIMER, plans, type Plan } from "@/lib/portal/billing";
import { packageWhatsAppUrl, startPackageCheckout } from "@/lib/portal/start-package";

type Props = { mode: "public" } | { mode: "portal"; currentPlanId: string | null };

const FEATURED = "elite";

const periodLabel: Record<Plan["period"], string> = { month: "/month", year: "/year", lifetime: "one-time" };

// How many of each account a package covers (Annual covers two of each).
const accountCount: Record<string, number> = { annual: 2 };

type Look = { icon: ReactNode; tile: string; badge: string };
const looks: Record<string, Look> = {
  watch: {
    tile: "from-sky-500 to-brand-600",
    badge: "Monthly",
    icon: (
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    ),
  },
  elite: {
    tile: "from-fuchsia-500 to-brand-600",
    badge: "Monthly",
    icon: <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  },
  annual: {
    tile: "from-emerald-500 to-teal-600",
    badge: "Yearly",
    icon: (
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v10a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-10ZM4 10h16M8.5 3v4m7-4v4m-7 7.5 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  lifetime: {
    tile: "from-amber-400 to-orange-500",
    badge: "Pay once",
    icon: (
      <path d="M12 12c-2-2.7-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.3 5.5-4Zm0 0c2 2.7 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.3-5.5 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    ),
  },
};

export function PackagesGrid(props: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorFor, setErrorFor] = useState<{ id: string; message: string } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // "static" until the browser says animation is OK, so the cards are always
  // visible even if scripts haven't run yet.
  const [reveal, setReveal] = useState<"static" | "pending" | "shown">("static");

  useEffect(() => {
    const row = rowRef.current;
    if (!row || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const box = row.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReveal("shown"); // already on screen: animate straight away
      return;
    }
    setReveal("pending");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setReveal("shown");
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(row);
    return () => io.disconnect();
  }, []);

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
        data-reveal={reveal}
        className="pkg-row -mx-4 flex items-start snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 pt-5 sm:items-stretch [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden"
      >
        {plans.map((plan, i) => {
          const isCurrent = props.mode === "portal" && props.currentPlanId === plan.id;
          const featured = plan.id === FEATURED && !isCurrent;
          const dark = plan.id === FEATURED;
          const look = looks[String(plan.id)] ?? looks.watch;
          const n = accountCount[String(plan.id)] ?? 1;
          return (
            <article
              key={plan.id}
              style={{ ["--d" as string]: `${i * 110}ms` }}
              className={`pkg-reveal pkg-card group relative flex w-[86%] shrink-0 snap-center flex-col rounded-3xl p-6 sm:w-auto ${
                dark
                  ? "pkg-featured bg-gradient-to-b from-[#1b1240] via-[#24145a] to-[#2e1a6e] text-white shadow-2xl shadow-brand-900/30"
                  : "border border-ink-100 bg-white shadow-sm"
              } ${isCurrent ? "ring-2 ring-brand-500" : ""}`}
            >
              {featured ? (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-fuchsia-500 to-brand-500 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand-600/40">
                  ★ Recommended
                </span>
              ) : null}
              {isCurrent ? (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-600 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg">
                  Your package
                </span>
              ) : null}

              {/* Icon, name, billing badge */}
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`pkg-icon flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${look.tile} text-white shadow-lg`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    {look.icon}
                  </svg>
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    dark ? "bg-white/10 text-brand-100 ring-1 ring-white/20" : "bg-ink-50 text-ink-600 ring-1 ring-ink-100"
                  }`}
                >
                  {look.badge}
                </span>
              </div>
              <h3 className={`mt-4 text-lg font-bold ${dark ? "text-white" : "text-ink-900"}`}>{plan.name.replace("MetaShield ", "")}</h3>
              <p className={`mt-0.5 min-h-[2.5rem] text-sm leading-5 ${dark ? "text-brand-100/80" : "text-ink-500"}`}>{plan.tagline}</p>

              {/* Price */}
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className={`text-4xl font-extrabold tracking-tight xl:text-[2.1rem] ${dark ? "text-white" : "text-ink-900"}`}>{plan.price}</span>
                <span className={`whitespace-nowrap text-sm font-medium ${dark ? "text-brand-200" : "text-ink-500"}`}>{periodLabel[plan.period]}</span>
              </div>

              {/* What it covers */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                <CoverChip dark={dark} on={plan.covers.instagram} label={`${n > 1 ? `${n}× ` : ""}Instagram`} />
                <CoverChip dark={dark} on={plan.covers.facebook} label={`${n > 1 ? `${n}× ` : ""}Facebook`} />
                <CoverChip dark={dark} on={plan.covers.ads} label="Meta ads" />
              </div>

              {/* The selling point */}
              <div
                className={`mt-5 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 ${
                  dark ? "bg-emerald-400/15 ring-1 ring-emerald-300/30" : "bg-emerald-50 ring-1 ring-emerald-200"
                }`}
              >
                <span className="pkg-pulse relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z" fill="currentColor" fillOpacity=".25" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="m8.5 12.2 2.4 2.4 4.6-4.9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className={`text-[13px] font-semibold leading-tight ${dark ? "text-emerald-100" : "text-emerald-800"}`}>
                  Account recovery at no extra cost
                </p>
              </div>

              <div className={`my-5 h-px ${dark ? "bg-white/10" : "bg-ink-100"}`} />

              <ul className="flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2.5 text-sm leading-snug ${dark ? "text-brand-50/90" : "text-ink-600"}`}>
                    <span
                      className={`mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                        dark ? "bg-white/15 text-white" : "bg-brand-50 text-brand-600"
                      }`}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {plan.note ? (
                <p className={`mt-5 rounded-xl px-3 py-2 text-xs leading-relaxed ${dark ? "bg-white/5 text-brand-100/70" : "bg-ink-50 text-ink-500"}`}>
                  {plan.note}
                </p>
              ) : null}
              <div className="mt-6">
                <PackageButton
                  plan={plan}
                  dark={dark}
                  isCurrent={isCurrent}
                  busy={busyId === plan.id}
                  disabled={busyId !== null}
                  onClick={() => getPackage(plan)}
                />
                {errorFor?.id === plan.id ? (
                  <p className={`mt-2 text-xs ${dark ? "text-red-300" : "text-risk-high"}`}>
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

// Only what the package covers is shown (the note under the list says what isn't).
function CoverChip({ on, label, dark }: { on: boolean; label: string; dark: boolean }) {
  if (!on) return null;
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        dark ? "bg-white/10 text-white ring-1 ring-white/15" : "bg-brand-50 text-brand-700 ring-1 ring-brand-100"
      }`}
    >
      {label}
    </span>
  );
}

function PackageButton({
  plan,
  dark,
  isCurrent,
  busy,
  disabled,
  onClick,
}: {
  plan: Plan;
  dark: boolean;
  isCurrent: boolean;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const base = "flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold transition";
  if (isCurrent) {
    return (
      <span className={`${base} ${dark ? "bg-white/10 text-brand-100 ring-1 ring-white/20" : "bg-ink-50 text-ink-500 ring-1 ring-ink-200"}`}>
        Current package
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Get the ${plan.name} package`}
      className={`pkg-shine group/btn ${base} ${
        dark
          ? "pkg-shine-auto bg-white text-brand-800 shadow-lg shadow-black/20 hover:bg-brand-50"
          : "bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md shadow-brand-600/25 hover:shadow-lg hover:shadow-brand-600/35"
      } disabled:opacity-60`}
    >
      {busy ? "Opening payment…" : "Get this package"}
      {busy ? null : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="transition-transform group-hover/btn:translate-x-1">
          <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
