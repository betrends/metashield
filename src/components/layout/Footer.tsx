import Link from "next/link";
import { brandName, brandTagline, contact, footerNav } from "@/lib/site-config";
import { Container } from "@/components/ui/Container";
import { getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/translate";

function FooterColumn({
  title,
  links,
  t,
}: {
  title: string;
  links: { label: string; href: string }[];
  t: T;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-ink-300 transition-colors hover:text-brand-300"
            >
              {t(link.label)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function Footer() {
  const t = await getT();
  return (
    <footer className="bg-ink-900 text-ink-300">
      <Container className="py-16">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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
                </svg>
              </span>
              <span className="text-base font-semibold text-white">
                {brandName}
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-ink-400">
              {t(brandTagline)}.{" "}
              {t(
                "{brand} is an independent account-support service and is not affiliated with or endorsed by Meta, Instagram, Facebook, TikTok or other platforms unless explicitly stated.",
                { brand: brandName },
              )}
            </p>
            <div className="mt-5 space-y-1.5 text-sm text-ink-400">
              <p>{contact.email}</p>
              <p>{contact.phone}</p>
              <p>{t(contact.address)}</p>
            </div>
          </div>

          <FooterColumn title={t("Services")} links={footerNav.services} t={t} />
          <FooterColumn title={t("Company")} links={footerNav.company} t={t} />
          <FooterColumn title={t("Tools")} links={footerNav.tools} t={t} />
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-400">
            © {new Date().getFullYear()} {brandName}.{" "}
            {t("All rights reserved. We will never ask for your social media password.")}
          </p>
          <div className="flex items-center gap-5">
            {footerNav.legal.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-ink-400 hover:text-brand-300"
              >
                {t(link.label)}
              </Link>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-600 opacity-50 transition-opacity duration-500 hover:opacity-100">
          {t("MetaShield is by")}{" "}
          <a
            href="https://instagram.com/bethetrendsng"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:text-brand-400"
          >
            BetheTrendsNG
          </a>
          {" "}· <span className="font-serif italic">Aow</span>
        </p>
      </Container>
    </footer>
  );
}
