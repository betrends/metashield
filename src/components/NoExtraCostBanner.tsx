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
    <section className="py-12 sm:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-[28px] bg-ink-950 px-6 py-12 text-white sm:px-14 sm:py-16">
          <div className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2.5 text-sm font-medium text-ink-300">
                <span aria-hidden="true" className="h-px w-6 bg-ink-500" />
                Included in every MetaShield package
              </p>
              <h2 className="mt-5 max-w-[16ch] text-[2.1rem] text-white sm:text-[3rem]">
                If anything happens, recovery costs you nothing extra.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-300 sm:text-lg">
                Subscribe once. If your Instagram or Facebook is ever hacked, suspended or disabled, our team handles the
                recovery with you on WhatsApp — no recovery fee on top. Packages from{" "}
                <span className="font-semibold text-white">₦10,000 a month</span>, and your{" "}
                <span className="font-semibold text-white">first month is free</span>.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={packagesHref} size="lg" className="!bg-white !text-ink-900 hover:!bg-ink-100">
                  See the packages
                </ButtonLink>
                {secondary ? (
                  <Link
                    href={secondary.href}
                    className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-[15px] font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10"
                  >
                    {secondary.label}
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Without vs with */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 p-5">
                <p className="text-sm text-ink-400">Without a package</p>
                <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <p className="text-[15px] text-ink-200">Account suspended or disabled</p>
                  <p className="text-[15px] font-semibold text-[#f2a59b] sm:text-right">You pay a recovery fee</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white p-5 text-ink-900">
                <p className="text-sm text-risk-low">With a MetaShield package</p>
                <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <p className="text-[15px] text-ink-600">Account suspended or disabled</p>
                  <p className="whitespace-nowrap font-serif text-3xl text-ink-900 sm:text-right">
                    ₦0 <span className="font-sans text-sm font-semibold text-ink-600">recovery fee</span>
                  </p>
                </div>
                <ul className="mt-4 grid gap-2 border-t border-ink-100 pt-4 text-sm text-ink-600 sm:grid-cols-2">
                  {[
                    "No recovery fee or deposit",
                    "Recovery handled on WhatsApp",
                    "Account security checks",
                    "Meta ad accounts on Elite, Business and Lifetime",
                  ].map((x) => (
                    <li key={x} className="flex items-start gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-risk-low" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="px-1 text-xs leading-relaxed text-ink-400">
                For eligible cases covered by your plan. Recovery isn&apos;t guaranteed — Meta makes the final decision.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
