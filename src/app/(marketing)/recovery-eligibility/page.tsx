import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { RecoveryOnWhatsApp } from "@/components/RecoveryOnWhatsApp";

// This address is kept for old links and search results. Recovery is now
// handled on WhatsApp, so the page points there instead of the old form.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Account Recovery on WhatsApp"),
    description: t(
      "Locked out of Instagram, Facebook or a Meta ad account? Message MetaShield on WhatsApp and our team will handle your recovery."
    ),
  };
}

export default async function RecoveryEligibilityPage() {
  const t = await getT();
  return (
    <>
      <section className="bg-brand-glow">
        <Container className="py-14 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="flex justify-center">
              <Eyebrow>{t("Account Recovery")}</Eyebrow>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl text-balance">
              {t("Locked out? Let's get your account back.")}
            </h1>
            <p className="mt-3 text-ink-600 text-balance">
              {t("Message us on WhatsApp with what happened — our team will assess it and handle the recovery with you.")}
            </p>
          </div>
        </Container>
      </section>

      <Section className="pb-24 pt-10 sm:pt-12">
        <div className="mx-auto max-w-xl">
          <RecoveryOnWhatsApp />
          <div className="mt-8 rounded-2xl bg-brand-50 px-5 py-4 text-center">
            <p className="text-sm font-semibold text-ink-900">{t("Not locked out yet?")}</p>
            <p className="mt-1 text-sm text-ink-600">
              {t("Protect your account now — packages from ₦10,000/month, and recovery is included if anything happens.")}
            </p>
            <ButtonLink href="/pricing#packages" size="sm" className="mt-3">
              {t("See protection packages")}
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
