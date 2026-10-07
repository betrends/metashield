"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { brandName, servicesNav } from "@/lib/site-config";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useT } from "@/lib/i18n/client";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

// Secondary nav links, shown alongside services in the header. Pricing
// and About are intentionally left out of the nav bar — still reachable
// from the footer.
const headerSecondaryNav = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "Case Studies", href: "/case-studies" },
  { label: "Reviews", href: "/reviews" },
];

const mobileSecondaryNav = [
  ...headerSecondaryNav,
  { label: "Resources", href: "/resources" },
  { label: "Contact", href: "/contact" },
];

function Logo() {
  const t = useT();
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-900/20">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
            fill="currentColor"
            fillOpacity="0.18"
          />
          <path
            d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="m8.5 12.2 2.4 2.4 4.6-4.9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-lg font-semibold tracking-tight text-ink-900">{brandName}</span>
        <span className="text-[10px] font-medium tracking-wide text-ink-400">{t("by BetheTrendsNG")}</span>
      </span>
    </Link>
  );
}

export function Header() {
  const t = useT();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile menu when the route changes. Adjusting state during
  // render (rather than in an effect) avoids an extra post-navigation
  // render pass — see https://react.dev/learn/you-might-not-need-an-effect
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-3">
        <Logo />

        {/* Desktop nav — services shown directly, no dropdown. Centered in
            the remaining space between the logo and the sign-up button
            via flex-1 + justify-center, so it stays centered regardless
            of how wide either side is. */}
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-0.5">
          {servicesNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-2.5 py-2 text-sm font-medium transition-colors ${
                  active ? "text-brand-700" : "text-ink-700 hover:text-brand-700"
                }`}
              >
                {t(item.label)}
              </Link>
            );
          })}
          <span className="mx-1 h-4 w-px bg-ink-100" />
          {headerSecondaryNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-2.5 py-2 text-sm font-medium transition-colors ${
                  active ? "text-brand-700" : "text-ink-700 hover:text-brand-700"
                }`}
              >
                {t(item.label)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex shrink-0 items-center gap-2">
          <LanguageToggle />
          <ButtonLink href="/portal/login" variant="ghost" size="sm">
            {t("Log In")}
          </ButtonLink>
          <ButtonLink href="/portal/login?mode=sign-up" size="sm">
            {t("Sign Up")}
          </ButtonLink>
        </div>

        {/* Language toggle stays visible in the mobile bar, next to the menu button */}
        <LanguageToggle className="ml-auto lg:hidden" />

        {/* Mobile / tablet toggle */}
        <button
          className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-ink-50"
          aria-label={t("Toggle menu")}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </Container>

      {/* Mobile / tablet menu */}
      {mobileOpen ? (
        <div className="lg:hidden border-t border-ink-100 bg-white">
          <Container className="flex flex-col gap-1 py-4">
            <p className="px-3.5 pt-1 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
              {t("Services")}
            </p>
            {servicesNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3.5 py-3 text-sm font-semibold text-ink-900 hover:bg-brand-50 hover:text-brand-700"
              >
                {t(item.label)}
              </Link>
            ))}

            <p className="mt-2 px-3.5 pt-1 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
              {t("Company")}
            </p>
            {mobileSecondaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3.5 py-3 text-sm font-semibold text-ink-900 hover:bg-brand-50 hover:text-brand-700"
              >
                {t(item.label)}
              </Link>
            ))}

            <div className="mt-2 flex flex-col gap-2 px-1">
              <ButtonLink href="/portal/login?mode=sign-up" className="w-full">
                {t("Sign Up")}
              </ButtonLink>
              <ButtonLink href="/portal/login" variant="outline" className="w-full">
                {t("Log In")}
              </ButtonLink>
              <ButtonLink
                href="/recovery-eligibility"
                variant="ghost"
                className="w-full"
              >
                {t("Start Your Recovery")}
              </ButtonLink>
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
