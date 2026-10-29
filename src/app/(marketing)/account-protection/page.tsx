import { getT } from "@/lib/i18n/server";
import { PackagesGrid } from "@/components/PackagesGrid";
import { PACKAGES_HEADLINE } from "@/lib/portal/billing";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ProtectionDashboardPreview } from "@/components/ProtectionDashboardPreview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Account Protection"),
    description:
      t("Account Health Checks, risk scoring and ongoing Protection Program monitoring — proactive risk reduction, not a guarantee of immunity."),
  };
}

const healthCheckSteps = [
  {
    step: "Select platform",
    detail: "Instagram, Facebook, Meta Business, TikTok, Google Ads or other.",
    icon: "🌐",
  },
  {
    step: "Select account type",
    detail: "Personal, Creator, Business, Agency, E-commerce or Advertiser.",
    icon: "👤",
  },
  {
    step: "Describe the account",
    detail:
      "Account age, audience size, business category, advertising activity, previous restrictions or warnings.",
    icon: "📋",
  },
  {
    step: "Upload evidence",
    detail:
      "Screenshots, warning messages, account status notices, or platform emails — reviewed by our team.",
    icon: "📎",
  },
];

const riskCategories: { label: string; level: "low" | "medium" | "high" }[] = [
  { label: "Account status", level: "low" },
  { label: "Policy compliance", level: "medium" },
  { label: "Security", level: "low" },
  { label: "Advertising", level: "high" },
  { label: "Business assets", level: "medium" },
];

export default async function AccountProtectionPage() {
  const t = await getT();
  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left */}
            <div className="max-w-xl">
              <Eyebrow>{t("Account Protection & Risk Assessment")}</Eyebrow>
              <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">{t("Reduce risk")}{" "}<span className="text-brand-600">{t("before")}</span>{" "}{t("it becomes a restriction.")}</h1>
              <p className="mt-5 text-lg text-ink-600">{t("Account Protection is proactive risk reduction, not a guarantee of immunity. We help you spot and fix the things that commonly lead to restrictions — before they happen.")}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/check-my-account" size="lg">{t("Start Your Health Check")}</ButtonLink>
                <ButtonLink href="#subscriptions" variant="outline" size="lg">{t("See Packages")}</ButtonLink>
              </div>
            </div>

            {/* Right — Risk score preview */}
            <div className="relative">
              <Card className="p-7 shadow-xl shadow-brand-900/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink-900">{t("Account Health Score")}</p>
                  <RiskBadge level="medium" />
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <p className="text-5xl font-bold text-ink-900">68</p>
                  <p className="mb-1.5 text-lg text-ink-400">/100</p>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                    style={{ width: "68%" }}
                  />
                </div>
                <div className="mt-5 space-y-3">
                  {riskCategories.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between border-t border-ink-100 pt-3 first:border-t-0 first:pt-0"
                    >
                      <span className="text-sm text-ink-600">{t(row.label)}</span>
                      <RiskBadge level={row.level} />
                    </div>
                  ))}
                </div>
                <p className="mt-5 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">{t("⚠️ 2 areas flagged for attention. View full report →")}</p>
              </Card>

              {/* Floating badge */}
              <div className="absolute -left-4 -top-4 rounded-xl border border-brand-100 bg-white px-4 py-2.5 shadow-lg">
                <p className="text-xs font-semibold text-brand-600">{t("🛡️ Protected")}</p>
                <p className="text-sm font-bold text-ink-900">{t("3 accounts")}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Health check steps */}
      <Section>
        <SectionHeading
          eyebrow={t("Account Health Check")}
          title={t("A short questionnaire, reviewed by a real person")}
          description={t("Enter your account details and receive an assessment of potential risks — reviewed by our team, not an automated guess.")}
          align="center"
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {healthCheckSteps.map((item, i) => (
            <Card key={item.step} className="relative overflow-hidden">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-xl">
                  {item.icon}
                </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-ink-900">
                {t(item.step)}
              </h3>
              <p className="mt-1.5 text-sm text-ink-500">{t(item.detail)}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <ButtonLink href="/check-my-account" size="lg">{t("Start Your Free Health Check")}</ButtonLink>
        </div>
      </Section>

      {/* Risk score section */}
      <Section className="bg-ink-50/50">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>{t("Account Risk Score")}</Eyebrow>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{t("A clear score, broken down by category")}</h2>
            <p className="mt-4 text-ink-500">{t("Every health check comes back with an overall score out of 100 and a category-by-category breakdown, so you know exactly where risk is coming from.")}</p>
            <div className="mt-6 space-y-4">
              {[
                ["🔴", "High Risk", "Needs immediate attention — take action now"],
                ["🟡", "Medium Risk", "Areas to monitor and improve over time"],
                ["🟢", "Low Risk", "Looking good — keep following best practices"],
              ].map(([icon, label, desc]) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{t(label)}</p>
                    <p className="text-sm text-ink-500">{t(desc)}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{t("This score reflects our own internal assessment methodology. It is not an official score issued by Meta or any other platform.")}</p>
          </div>

          <Card className="p-7">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-900">{t("Account Health")}</p>
              <RiskBadge level="medium" />
            </div>
            <p className="mt-3 text-4xl font-bold text-ink-900">
              68<span className="text-lg font-normal text-ink-400">/100</span>
            </p>
            <div className="mt-5 space-y-3">
              {riskCategories.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border-t border-ink-100 pt-3 first:border-t-0 first:pt-0"
                >
                  <span className="text-sm text-ink-600">{t(row.label)}</span>
                  <RiskBadge level={row.level} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      {/* Protection dashboard preview */}
      <Section>
        <SectionHeading
          eyebrow={t("Protection Program")}
          title={t("Ongoing monitoring for businesses, creators and high-value accounts")}
          description={t("After your assessment, the Protection Program keeps watch — flagging issues as they emerge, not after they escalate.")}
          align="center"
        />
        <div className="mt-10">
          <ProtectionDashboardPreview />
        </div>
        <p className="mt-4 text-center text-sm text-ink-500">{t("We're reducing risk, not promising immunity from platform enforcement. See packages below.")}</p>
      </Section>

      {/* Subscriptions */}
      <Section id="subscriptions" className="scroll-mt-16 bg-ink-50/50">
        <SectionHeading
          eyebrow={t("MetaShield packages")}
          title={t(PACKAGES_HEADLINE)}
          description={t("Ongoing account support with recovery included — for individuals, creators and businesses.")}
          align="center"
        />
        <div className="mt-12">
          <PackagesGrid mode="public" />
        </div>
      </Section>

      {/* CTA */}
      <Section className="pb-24">
        <div className="rounded-3xl bg-brand-600 px-8 py-14 text-center sm:px-16">
          <h2 className="text-balance text-3xl font-bold text-white sm:text-4xl">{t("Don't wait for a warning to take action.")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-brand-100">{t("Most accounts show risk signals weeks before enforcement action. Run a free health check and find out where yours stands.")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/check-my-account" size="lg" className="bg-white text-brand-700 hover:bg-brand-50">{t("Run a Free Health Check")}</ButtonLink>
            <ButtonLink href="/contact" size="lg" variant="outline">{t("Talk to Our Team")}</ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
