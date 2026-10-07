import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import dynamic from "next/dynamic";
const EligibilityWizard = dynamic(
  () => import("@/components/EligibilityWizard").then(m => m.EligibilityWizard),
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
    title: t("Recovery Eligibility Checker"),
    description:
      t("A short questionnaire to see whether your account issue is a good fit for professional recovery support."),
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
              <Eyebrow>{t("Recovery Eligibility Checker")}</Eyebrow>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl text-balance">{t("Can we help recover your account?")}</h1>
            <p className="mt-3 text-ink-600 text-balance">{t("A short questionnaire — about two minutes — to see if your situation is a good fit for professional recovery support.")}</p>
          </div>
        </Container>
      </section>

      <Section className="pb-24 pt-10 sm:pt-12">
        <div className="mx-auto max-w-2xl">
          <EligibilityWizard />
        </div>
      </Section>
    </>
  );
}
