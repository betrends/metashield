import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import dynamic from "next/dynamic";
const HealthCheckWizard = dynamic(
  () => import("@/components/HealthCheckWizard").then(m => m.HealthCheckWizard),
  {
    loading: () => (
      <div className="animate-pulse rounded-2xl border border-ink-100 bg-white p-8">
        <div className="h-4 w-1/3 rounded bg-ink-100" />
        <div className="mt-4 h-3 w-2/3 rounded bg-ink-50" />
        <div className="mt-8 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-11 rounded-xl bg-ink-50" />
          ))}
        </div>
        <div className="mt-8 h-11 w-full rounded-xl bg-brand-100" />
      </div>
    ),
  }
);

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Check My Account — Account Health Check"),
    description:
      t("Get a preliminary risk assessment for your Instagram, Facebook, Meta Business, TikTok or Google Ads account."),
  };
}

export default async function CheckMyAccountPage() {
  const t = await getT();
  return (
    <>
      <section className="bg-brand-glow">
        <Container className="py-14 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="flex justify-center">
              <Eyebrow>{t("★ Account Health Check")}</Eyebrow>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl text-balance">{t("Check My Account Health")}</h1>
            <p className="mt-3 text-ink-600 text-balance">{t("Four short steps to a preliminary risk assessment, reviewed by our team. Takes about 3 minutes.")}</p>
          </div>
        </Container>
      </section>

      <Section className="pb-24 pt-10 sm:pt-12">
        <div className="mx-auto max-w-2xl">
          <HealthCheckWizard />
        </div>
      </Section>
    </>
  );
}
