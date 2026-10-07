import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { recoveryPlatforms } from "@/lib/content/recovery";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Business & Ad Account Issues"),
    description:
      t("Support for Meta Business Manager restrictions, Business Portfolio issues and advertising account problems affecting businesses and agencies."),
  };
}

const metaBusiness = recoveryPlatforms.find((p) => p.slug === "meta-business")!;

const builtForTeams = [
  {
    title: "Multiple accounts",
    icon: "🗂️",
    description:
      "Manage recovery and protection across every ad account and Page tied to your Business Manager.",
  },
  {
    title: "Multiple admins",
    icon: "👥",
    description:
      "We review admin roles and access as part of every Business Manager assessment.",
  },
  {
    title: "Business Manager review",
    icon: "🏢",
    description:
      "A structured audit of your Business Manager health, not just a single flagged asset.",
  },
  {
    title: "Ad account monitoring",
    icon: "📊",
    description:
      "Ongoing visibility into spend limits, disapprovals and policy flags before they escalate.",
  },
  {
    title: "Priority case handling",
    icon: "⚡",
    description:
      "Business and agency cases are fast-tracked given the operational impact of downtime.",
  },
  {
    title: "Dedicated account manager",
    icon: "🤝",
    description:
      "A single point of contact who knows your account history — available on our Business plan.",
  },
];

const impacts = [
  { label: "Campaigns paused", icon: "⏸️" },
  { label: "Revenue lost", icon: "📉" },
  { label: "Team access cut off", icon: "🔒" },
  { label: "Pages disconnected", icon: "🔗" },
];

export default async function BusinessAdsPage() {
  const t = await getT();
  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left */}
            <div className="max-w-xl">
              <Eyebrow>{t("Business & Ad Account Issues")}</Eyebrow>
              <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">{t("When ad account downtime is a")}{" "}
                <span className="text-brand-600">{t("business problem")}</span>.
              </h1>
              <p className="mt-5 text-lg text-ink-600">{t("A restricted Business Manager or ad account doesn't just affect one profile — it affects every campaign, Page and team member attached to it. We handle these cases with the operational context your business needs.")}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/recovery-eligibility" size="lg">{t("Check Recovery Eligibility")}</ButtonLink>
                <ButtonLink href="/contact" variant="outline" size="lg">{t("Talk to Our Team")}</ButtonLink>
              </div>
            </div>

            {/* Right — impact card */}
            <div className="relative">
              <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-xl shadow-red-900/5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-red-600">{t("When your ad account goes down")}</p>
                <div className="grid grid-cols-2 gap-3">
                  {impacts.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2.5 rounded-xl bg-red-50 px-3 py-3"
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-sm font-medium text-red-800">
                        {t(item.label)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-xl bg-brand-600 px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-white">{t("🛡️ MetaShield gets it back — fast")}</p>
                </div>
              </div>

              {/* Floating stat */}
              <div className="absolute -right-4 -top-4 rounded-xl border border-green-100 bg-white px-4 py-2.5 shadow-lg">
                <p className="text-xs font-semibold text-green-600">{t("⚡ Priority")}</p>
                <p className="text-sm font-bold text-ink-900">{t("Business cases")}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Common issues */}
      <Section>
        <SectionHeading
          eyebrow={t("Common issues")}
          title={t("Meta Business Manager & advertising issues we resolve")}
          description={t("Each case follows the same structured path: Problem → Diagnosis → Process → Timeline → Requirements → Resolution.")}
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {metaBusiness?.issues.map((issue) => (
            <Card
              key={issue.slug}
              className="group transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-ink-900">
                    {t(issue.problem)}
                  </h3>
                  <p className="mt-1.5 text-sm text-ink-500">{t(issue.diagnosis)}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4 text-xs">
                <span className="flex items-center gap-1.5 text-ink-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  {t(issue.timeline)}
                </span>
                <a
                  href={`/account-recovery#${metaBusiness.slug}`}
                  className="font-semibold text-brand-700 hover:text-brand-800"
                >{t("Full process →")}</a>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Built for teams */}
      <Section className="bg-ink-50/50">
        <SectionHeading
          eyebrow={t("Built for teams")}
          title={t("Structured for businesses and agencies managing multiple accounts")}
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {builtForTeams.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-xl">
                {item.icon}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink-900">{t(item.title)}</h3>
                <p className="mt-1.5 text-sm text-ink-500">{t(item.description)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <ButtonLink href="/account-protection#subscriptions" size="lg">{t("See the Business Protection Plan")}</ButtonLink>
        </div>
      </Section>

      {/* CTA */}
      <Section className="pb-24">
        <div className="rounded-3xl bg-brand-600 px-8 py-14 text-center sm:px-16">
          <h2 className="text-balance text-3xl font-bold text-white sm:text-4xl">{t("More platforms coming soon")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-brand-100">{t("We currently support Instagram, Facebook and Meta Business. TikTok, X, Snapchat and Google Ads support is planned as we grow.")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/check-my-account" size="lg" className="bg-white text-brand-700 hover:bg-brand-50">{t("Run an Account Health Check")}</ButtonLink>
            <ButtonLink href="/contact" size="lg" variant="outline">{t("Talk to Our Team")}</ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
