import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Pricing"),
    description:
      t("Transparent pricing for account recovery and protection. Assessment is always free. Recovery pricing is based on account size."),
  };
}

const recoveryTiers = [
  { range: "0 – 500", price: "₦100,000" },
  { range: "500 – 1,000", price: "₦120,000" },
  { range: "1,000 – 5,000", price: "₦140,000" },
  { range: "5,000 – 10,000", price: "₦160,000" },
  { range: "10,000 – 15,000", price: "₦175,000" },
  { range: "15,000 – 20,000", price: "₦185,000" },
  { range: "20,000 – 25,000", price: "₦200,000" },
  { range: "25,000 – 30,000", price: "₦220,000" },
  { range: "30,000 – 35,000", price: "₦250,000" },
  { range: "35,000 – 40,000", price: "₦265,000" },
  { range: "40,000 – 45,000", price: "₦285,000" },
  { range: "45,000 – 50,000", price: "₦300,000" },
  { range: "50,000+", price: "₦500,000" },
];

const protectionFeatures = [
  "Monthly account health review",
  "Risk score & category breakdown",
  "Security vulnerability check",
  "Policy compliance review",
  "Priority support access",
  "Early warning alerts",
];

const businessFeatures = [
  "Everything in Protection",
  "Multiple accounts covered",
  "Business Manager review",
  "Ad account monitoring",
  "Multiple admin management",
  "Dedicated account manager",
  "Priority case handling",
];

export default async function PricingPage() {
  const t = await getT();
  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="max-w-xl">
              <Eyebrow>{t("Pricing")}</Eyebrow>
              <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">{t("Honest pricing, no")}{" "}
                <span className="text-brand-600">{t("hidden fees")}</span>.
              </h1>
              <p className="mt-5 text-lg text-ink-600">{t("Assessment is always free. Recovery pricing is based on your account size — the larger your audience, the more complex the case. You only pay after we assess and you agree to proceed.")}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/check-my-account" size="lg">{t("Start Free Assessment")}</ButtonLink>
                <ButtonLink href="/contact" variant="outline" size="lg">{t("Talk to Our Team")}</ButtonLink>
              </div>
            </div>

            {/* Right — quick summary card */}
            <div className="space-y-3">
              {[
                { label: "Account Assessment", price: "Free", icon: "🔍", color: "bg-green-50 border-green-200", priceColor: "text-green-700" },
                { label: "Standard Recovery", price: "From ₦100,000", icon: "🛡️", color: "bg-brand-50 border-brand-200", priceColor: "text-brand-700" },
                { label: "Account Protection", price: "₦50,000/mo", icon: "📊", color: "bg-purple-50 border-purple-200", priceColor: "text-purple-700" },
                { label: "Business / Complex Cases", price: "Custom quote", icon: "🏢", color: "bg-ink-50 border-ink-200", priceColor: "text-ink-700" },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${item.color}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm font-semibold text-ink-900">{t(item.label)}</span>
                  </div>
                  <span className={`text-sm font-bold ${item.priceColor}`}>{t(item.price)}</span>
                </div>
              ))}
              <p className="pt-1 text-center text-xs text-ink-400">{t("No recovery, no charge for the assessment.")}</p>
            </div>
          </div>
        </Container>
      </section>

      {/* Assessment — free */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <Eyebrow>{t("Step 1 — Always free")}</Eyebrow>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{t("Account Assessment")}</h2>
            <p className="mt-4 text-ink-500">{t("Before any payment, we review your account status, the likely cause of the issue, and the best path to resolution. You get a clear diagnosis and a quote — completely free, no obligation.")}</p>
            <ul className="mt-6 space-y-3">
              {[
                "Full diagnosis of your account issue",
                "Recommended recovery path",
                "Clear timeline estimate",
                "Transparent quote before you commit",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-ink-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-green-600">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t(item)}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <ButtonLink href="/check-my-account" size="lg">{t("Start Free Assessment →")}</ButtonLink>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-green-200 bg-green-50 px-8 py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
              🔍
            </div>
            <p className="mt-4 text-4xl font-bold text-green-700">{t("FREE")}</p>
            <p className="mt-2 text-sm font-semibold text-green-800">{t("Account Assessment")}</p>
            <p className="mt-3 text-sm text-green-700">{t("No credit card. No commitment.")}<br />{t("Just answers.")}</p>
          </div>
        </div>
      </Section>

      {/* Recovery pricing — follower tiers */}
      <Section className="bg-ink-50/50">
        <SectionHeading
          eyebrow={t("Step 2 — Recovery")}
          title={t("Disabled Account Recovery Pricing")}
          description={t("Pricing is based on your follower count at the time of the case. The larger the account, the more complex the recovery process.")}
          align="center"
        />

        <div className="mt-10 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-2 border-b border-ink-100 bg-brand-600 px-6 py-3">
            <span className="text-xs font-bold uppercase tracking-widest text-white">{t("Followers")}</span>
            <span className="text-right text-xs font-bold uppercase tracking-widest text-white">{t("Recovery Fee")}</span>
          </div>

          {/* Tiers */}
          {recoveryTiers.map((tier, i) => (
            <div
              key={tier.range}
              className={`grid grid-cols-2 items-center px-6 py-3.5 ${
                i % 2 === 0 ? "bg-white" : "bg-ink-50/40"
              } ${i < recoveryTiers.length - 1 ? "border-b border-ink-100" : ""}`}
            >
              <div className="flex items-center gap-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-brand-500">
                  <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm text-ink-700">
                  <strong className="font-semibold text-ink-900">{t(tier.range)}</strong>{" "}{t("followers")}</span>
              </div>
              <span className={`text-right text-sm font-bold ${
                i === recoveryTiers.length - 1 ? "text-brand-700" : "text-ink-900"
              }`}>
                {t(tier.price)}
              </span>
            </div>
          ))}

          {/* Footer note */}
          <div className="border-t border-ink-100 bg-brand-50 px-6 py-4">
            <p className="text-xs text-brand-800">
              💡 <strong>{t("Business & agency accounts")}</strong>{" "}{t("(Meta Business Manager, ad accounts, multi-account cases) are assessed individually — prices may differ.")}{" "}<a href="/contact" className="font-semibold underline">{t("Request a custom quote →")}</a>
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <ButtonLink href="/recovery-eligibility" size="lg">{t("Check Your Recovery Eligibility")}</ButtonLink>
        </div>
      </Section>

      {/* Protection plans */}
      <Section>
        <SectionHeading
          eyebrow={t("Ongoing Protection")}
          title={t("Keep your account safe after recovery")}
          description={t("Monthly monitoring plans to reduce the risk of it happening again.")}
          align="center"
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* Basic */}
          <Card className="flex flex-col p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">{t("Basic")}</p>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-bold text-ink-900">₦50,000</span>
                <span className="mb-1 text-sm text-ink-400">{t("/mo")}</span>
              </div>
              <p className="mt-1.5 text-sm text-ink-500">{t("A monthly check-in on account health.")}</p>
            </div>
            <ul className="mt-6 flex-1 space-y-2.5">
              {["Monthly account health review", "Risk score breakdown", "Security check", "Email support"].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-brand-600">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t(f)}
                </li>
              ))}
            </ul>
            <ButtonLink href="/contact" size="lg" className="mt-8 w-full text-center">{t("Get Started")}</ButtonLink>
          </Card>

          {/* Professional */}
          <Card className="relative flex flex-col border-brand-300 p-7 shadow-lg">
            <div className="absolute right-5 top-5 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">{t("Popular")}</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">{t("Professional")}</p>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-bold text-ink-900">₦65,000</span>
                <span className="mb-1 text-sm text-ink-400">{t("/mo")}</span>
              </div>
              <p className="mt-1.5 text-sm text-ink-500">{t("For creators and single-account businesses.")}</p>
            </div>
            <ul className="mt-6 flex-1 space-y-2.5">
              {protectionFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-brand-600">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t(f)}
                </li>
              ))}
            </ul>
            <ButtonLink href="/contact" size="lg" className="mt-8 w-full text-center">{t("Get Started")}</ButtonLink>
          </Card>

          {/* Business */}
          <Card className="flex flex-col p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">{t("Business")}</p>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-bold text-ink-900">₦85,000</span>
                <span className="mb-1 text-sm text-ink-400">{t("/mo")}</span>
              </div>
              <p className="mt-1.5 text-sm text-ink-500">{t("For agencies managing multiple accounts.")}</p>
            </div>
            <ul className="mt-6 flex-1 space-y-2.5">
              {businessFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-brand-600">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t(f)}
                </li>
              ))}
            </ul>
            <ButtonLink href="/contact" size="lg" className="mt-8 w-full text-center">{t("Get Started")}</ButtonLink>
          </Card>
        </div>
      </Section>

      {/* FAQ-style trust notes */}
      <Section className="bg-ink-50/50">
        <SectionHeading
          eyebrow={t("Good to know")}
          title={t("Common questions about pricing")}
          align="center"
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              q: "When do I pay?",
              a: "Only after your free assessment, when you've seen the quote and chosen to proceed. We never charge upfront without telling you what you're paying for.",
            },
            {
              q: "What if recovery isn't possible?",
              a: "You won't be charged the recovery fee. The assessment is free regardless of outcome.",
            },
            {
              q: "How is follower count verified?",
              a: "We review your account during the assessment. If your account is disabled we use the last known count from screenshots or platform data you provide.",
            },
            {
              q: "Are there payment plans?",
              a: "For larger cases, payment arrangements can be discussed during your assessment. Contact our team to ask.",
            },
            {
              q: "What payment methods do you accept?",
              a: "Bank transfer, and other methods discussed during onboarding. We'll confirm the options during your assessment.",
            },
            {
              q: "Does the monthly plan auto-renew?",
              a: "Yes, Protection plans are monthly subscriptions. You can cancel any time — just let us know before the next billing date.",
            },
          ].map((item) => (
            <div key={item.q} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-ink-900">{t(item.q)}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{t(item.a)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section className="pb-24">
        <div className="rounded-3xl bg-brand-600 px-8 py-14 text-center sm:px-16">
          <h2 className="text-balance text-3xl font-bold text-white sm:text-4xl">{t("Start with a free assessment")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-brand-100">{t("No commitment, no payment. Find out exactly what's wrong with your account and what it will take to recover it.")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/check-my-account" size="lg" className="bg-white text-brand-700 hover:bg-brand-50">{t("Check My Account Health — Free")}</ButtonLink>
            <ButtonLink href="/recovery-eligibility" size="lg" variant="outline">{t("Check Recovery Eligibility")}</ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
