import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { caseStudies } from "@/lib/content/case-studies";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Case Studies"),
    description:
      t("Anonymized examples of resolved account recovery cases across Instagram, Facebook and Meta Business."),
  };
}

export default async function CaseStudiesPage() {
  const t = await getT();
  return (
    <>
      <section className="bg-brand-glow">
        <Container className="py-16 sm:py-20">
          <div className="max-w-2xl">
            <Eyebrow>{t("Case Studies")}</Eyebrow>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl text-balance">{t("Real cases, anonymized outcomes.")}</h1>
            <p className="mt-5 text-lg text-ink-600 text-balance">{t("Every case is different, and outcomes aren't guaranteed — but here's the kind of work we handle and how it typically plays out. Details are anonymized to protect client privacy.")}</p>
          </div>
        </Container>
      </section>

      <Section>
        <div className="grid gap-6 sm:grid-cols-2">
          {caseStudies.map((study) => (
            <Card key={study.id}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-brand-700">{t("Case #")}{study.id}
                </span>
                <span className="rounded-full bg-risk-low-bg px-2.5 py-1 text-xs font-semibold text-risk-low">
                  {t(study.resolution)}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-ink-900">
                {t(study.problem)}
              </h2>

              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-ink-100 py-5 text-sm">
                <div>
                  <dt className="text-ink-400">{t("Platform")}</dt>
                  <dd className="mt-0.5 font-medium text-ink-800">
                    {t(study.platform)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-400">{t("Account type")}</dt>
                  <dd className="mt-0.5 font-medium text-ink-800">
                    {t(study.accountType)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-400">{t("Issue")}</dt>
                  <dd className="mt-0.5 font-medium text-ink-800">
                    {t(study.issue)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-400">{t("Initial status")}</dt>
                  <dd className="mt-0.5 font-medium text-ink-800">
                    {t(study.initialStatus)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-400">{t("Resolution")}</dt>
                  <dd className="mt-0.5 font-medium text-ink-800">
                    {t(study.resolution)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-400">{t("Timeline")}</dt>
                  <dd className="mt-0.5 font-medium text-ink-800">
                    {t(study.timeline)}
                  </dd>
                </div>
              </dl>

              <p className="mt-5 text-sm italic text-ink-500">
                {t(study.feedback)}
              </p>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-sm text-ink-400">{t("Timelines and outcomes vary by case complexity. Past results don't guarantee future outcomes.")}</p>
      </Section>

      <Section className="pb-24">
        <div className="rounded-3xl bg-ink-900 px-8 py-14 text-center sm:px-16">
          <h2 className="text-3xl font-semibold text-white text-balance sm:text-4xl">{t("Think your case could be next?")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-300 text-balance">{t("Run a quick eligibility check to see if your situation is a good fit for professional recovery support.")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/recovery-eligibility" size="lg">{t("Check Recovery Eligibility")}</ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
