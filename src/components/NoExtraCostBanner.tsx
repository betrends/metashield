// MetaShield's main selling point, as a band for marketing pages: with any
// package, account recovery comes at no extra cost. Shows the difference
// side by side (without a package you pay a recovery fee; with one you
// don't) and links to the packages.

import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function NoExtraCostBanner({
  packagesHref = "/pricing#packages",
  secondary = { href: "/check-my-account", label: "Check my account health" },
}: {
  packagesHref?: string;
  secondary?: { href: string; label: string } | null;
}) {
  return (
    <section className="py-12 sm:py-16">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1b1240] via-[#2a1766] to-[#4c1d95] px-6 py-10 text-white shadow-2xl shadow-brand-900/25 sm:px-12 sm:py-14">
          {/* Soft moving glow */}
          <div aria-hidden="true" className="nec-glow pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-fuchsia-500/30 blur-3xl" />
          <div aria-hidden="true" className="nec-glow pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl [animation-delay:2.5s]" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-300/30">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                </span>
                Included in every MetaShield package
              </span>
              <h2 className="mt-5 text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
                Account recovery at{" "}
                <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">no extra cost.</span>
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-100 sm:text-lg">
                Subscribe once. If your Instagram or Facebook is ever hacked, disabled or restricted, our team handles the
                recovery — with no recovery fee on top. Packages from <strong className="text-white">₦10,000/month</strong>.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={packagesHref} size="lg" className="!bg-white !font-bold !text-brand-800 shadow-lg shadow-black/20 hover:!bg-brand-50">
                  See the packages
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </ButtonLink>
                {secondary ? (
                  <Link
                    href={secondary.href}
                    className="inline-flex items-center justify-center rounded-full px-6 py-3.5 text-base font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/10"
                  >
                    {secondary.label}
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Without vs with */}
            <div className="space-y-3">
              <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-200">Without a package</p>
                <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p className="text-sm text-brand-100">Account hacked or disabled</p>
                  <p className="text-sm font-bold text-red-300 sm:text-right">You pay a recovery fee</p>
                </div>
              </div>
              <div className="relative rounded-2xl bg-white p-5 text-ink-900 shadow-xl ring-2 ring-emerald-300/60">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">With a MetaShield package</p>
                <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p className="text-sm text-ink-600">Account hacked or disabled</p>
                  <p className="whitespace-nowrap text-2xl font-extrabold text-emerald-600 sm:text-right">₦0 <span className="text-sm font-bold">recovery fee</span></p>
                </div>
                <ul className="mt-4 grid gap-2 border-t border-ink-100 pt-4 text-sm text-ink-600 sm:grid-cols-2">
                  {["No recovery fee or deposit", "Your own recovery agent", "Account security checks", "Meta ads on Elite & Lifetime"].map((x) => (
                    <li key={x} className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-emerald-600" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="px-1 text-[11px] leading-relaxed text-brand-200/80">
                For eligible cases covered by your plan. Recovery isn&apos;t guaranteed — Meta makes the final decision.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
