import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { brandName } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("About"),
    description: t("About {brand} — an independent account-support service helping people and businesses recover, protect and manage their digital accounts.", { brand: brandName }),
  };
}

const pillars = [
  {
    icon: "🛡️",
    tag: "Recover",
    color: "bg-red-50 border-red-100",
    iconBg: "bg-red-100",
    tagColor: "text-red-700",
    description:
      "Account recovery and restriction resolution when something has already gone wrong — disabled profiles, suspended pages, hacked access.",
  },
  {
    icon: "📊",
    tag: "Protect",
    color: "bg-amber-50 border-amber-100",
    iconBg: "bg-amber-100",
    tagColor: "text-amber-700",
    description:
      "Health assessments and proactive risk reduction before problems start. Know your risk score before the platform acts.",
  },
  {
    icon: "🤝",
    tag: "Manage",
    color: "bg-green-50 border-green-100",
    iconBg: "bg-green-100",
    tagColor: "text-green-700",
    description:
      "Ongoing monitoring, monthly reviews and priority support for businesses and creators who can't afford downtime.",
  },
];

const commitments = [
  { icon: "🔒", text: "We will never ask for your social media password" },
  { icon: "📁", text: "Secure, access-limited document handling" },
  { icon: "🤐", text: "Client confidentiality on every case" },
  { icon: "🗑️", text: "A clear data-deletion policy" },
  { icon: "📜", text: "Published privacy policy and terms of service" },
  { icon: "✅", text: "Transparent pricing — no hidden fees" },
];

const stats = [
  { value: "500+", label: "Cases handled" },
  { value: "4.9★", label: "Average rating" },
  { value: "7 days", label: "Avg. recovery time" },
  { value: "Lagos", label: "Based in Nigeria" },
];

const whyItems = [
  {
    icon: "❌",
    title: "The problem we saw",
    body: "An account gets restricted, and the person behind it has no clear process, no timeline, and no one to explain why. Hours become days. Days become weeks.",
  },
  {
    icon: "💡",
    title: "What we built instead",
    body: "A structured, documented alternative — with a real case file, a named agent, stage-by-stage updates, and a portal you can log into at any time.",
  },
  {
    icon: "🎯",
    title: "Who we serve",
    body: "Creators, small businesses, e-commerce sellers, ad agencies, and anyone whose livelihood depends on a digital account staying active.",
  },
];

export default async function AboutPage() {
  const t = await getT();
  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left */}
            <div className="max-w-xl">
              <Eyebrow>{t("About")}{" "}{brandName}</Eyebrow>
              <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">{t("We exist because")}{" "}
                <span className="text-brand-600">{t("losing an account")}</span>{" "}{t("shouldn't mean losing everything.")}</h1>
              <p className="mt-5 text-lg text-ink-600">
                {brandName}{" "}{t("is an independent account-support service based in Nigeria, helping individuals and businesses recover, protect and manage their digital accounts across Instagram, Facebook, Meta Business, TikTok and more.")}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/recovery-eligibility" size="lg">{t("Check Your Eligibility")}</ButtonLink>
                <ButtonLink href="/contact" variant="outline" size="lg">{t("Talk to Our Team")}</ButtonLink>
              </div>
            </div>

            {/* Right — stats snapshot */}
            <div className="relative">
              <Card className="p-7 shadow-xl shadow-brand-900/5">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">{t("By the numbers")}</p>
                <div className="mt-5 grid grid-cols-2 gap-5">
                  {stats.map((s) => (
                    <div key={s.label} className="rounded-xl bg-ink-50 px-4 py-4">
                      <p className="text-2xl font-bold text-ink-900">{s.value}</p>
                      <p className="mt-0.5 text-xs text-ink-500">{t(s.label)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{t("🛡️ Every case gets a named agent and a live case file.")}</div>
              </Card>

              {/* Floating badge */}
              <div className="absolute -left-4 -top-4 rounded-xl border border-green-100 bg-white px-4 py-2.5 shadow-lg">
                <p className="text-xs font-semibold text-green-600">{t("🇳🇬 Lagos, Nigeria")}</p>
                <p className="text-sm font-bold text-ink-900">{t("Serving Africa & beyond")}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Why we exist */}
      <Section>
        <SectionHeading
          eyebrow={t("Our story")}
          title={t("Built to fix a broken process")}
          description={t("The same story kept repeating: account restricted, no explanation, no path forward. We built the structured alternative.")}
          align="center"
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {whyItems.map((item) => (
            <Card key={item.title} className="flex flex-col gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-2xl">
                {item.icon}
              </span>
              <div>
                <h3 className="text-base font-semibold text-ink-900">{t(item.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{t(item.body)}</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Three pillars */}
      <Section className="bg-ink-50/50">
        <SectionHeading
          eyebrow={t("What we do")}
          title={t("Three services, one goal: fewer surprises")}
          align="center"
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {pillars.map((pillar) => (
            <div
              key={pillar.tag}
              className={`rounded-2xl border p-6 ${pillar.color}`}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${pillar.iconBg}`}
              >
                {pillar.icon}
              </span>
              <p className={`mt-4 text-xs font-bold uppercase tracking-widest ${pillar.tagColor}`}>
                {t(pillar.tag)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {t(pillar.description)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Trust commitments */}
      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>{t("Trust & security")}</Eyebrow>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{t("What we commit to on every single case")}</h2>
            <p className="mt-4 text-ink-500">{t("Trust is the foundation of what we do. You're sharing sensitive account details with us — here's exactly what that means in practice.")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {commitments.map((item) => (
              <div
                key={item.text}
                className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm"
              >
                <span className="mt-0.5 shrink-0 text-xl">{item.icon}</span>
                <p className="text-sm leading-relaxed text-ink-700">{t(item.text)}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Positioning / disclaimer */}
      <Section className="bg-ink-50/50">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="rounded-2xl border-2 border-dashed border-ink-200 bg-white px-8 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink-100 text-2xl">
              ⚖️
            </div>
            <p className="mt-5 text-lg font-semibold text-ink-900">{t("Risk reduction, not immunity")}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{t("No service can guarantee an account is immune from platform enforcement. When we say \"protection,\" we mean proactive risk reduction.")}</p>
          </div>
          <div>
            <Eyebrow>{t("Transparency")}</Eyebrow>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{t("Honest about what we can and can't do")}</h2>
            <p className="mt-4 text-ink-500">
              {brandName}{" "}{t("identifies the things that commonly trigger restrictions and helps you address them — before they escalate or after they've already happened.")}</p>
            <p className="mt-4 text-sm text-ink-400">
              {brandName}{" "}{t("is an independent account-support service and is not affiliated with or endorsed by Meta, Instagram, Facebook, TikTok or any other platform unless explicitly stated.")}</p>
            <div className="mt-8">
              <ButtonLink href="/how-it-works" size="lg" variant="outline">{t("See How Our Process Works →")}</ButtonLink>
            </div>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section className="pb-24">
        <div className="rounded-3xl bg-brand-600 px-8 py-14 text-center sm:px-16">
          <h2 className="text-balance text-3xl font-bold text-white sm:text-4xl">{t("Questions before you get started?")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-brand-100">{t("Our team responds within 24 hours. No obligation, no pressure — just a clear answer about whether we can help with your situation.")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/contact" size="lg" className="bg-white text-brand-700 hover:bg-brand-50">{t("Contact Our Team")}</ButtonLink>
            <ButtonLink href="/check-my-account" size="lg" variant="outline">{t("Run a Free Health Check")}</ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
