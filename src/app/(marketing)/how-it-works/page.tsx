import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { recoveryWhatsappUrl } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("How It Works"),
    description: t(
      "MetaShield protects your Instagram, Facebook and ad accounts — and if something goes wrong, we handle the recovery with you on WhatsApp."
    ),
  };
}

// MetaShield is protection-first. Recovery is still included in packages,
// but it is handled on WhatsApp — the website no longer takes recovery cases.
const protectionSteps = [
  {
    title: "Pick a package",
    description: "Watch, Elite or Business. Your first month is free — no card needed.",
    icon: "📦",
    color: "bg-blue-100 text-blue-700",
  },
  {
    title: "Do your protection checklist",
    description:
      "We email you the must-do steps: selfie verification, the right date of birth, checking logged-in devices and more.",
    icon: "✅",
    color: "bg-green-100 text-green-700",
  },
  {
    title: "Regular security checks",
    description: "We check your account security and help you fix weak spots before they become a problem.",
    icon: "🔍",
    color: "bg-amber-100 text-amber-700",
  },
  {
    title: "Recovery included",
    description:
      "If your account is ever suspended, disabled or restricted, eligible recoveries covered by your plan come at no extra cost.",
    icon: "🛡️",
    color: "bg-brand-100 text-brand-700",
  },
];

const recoverySteps = [
  {
    title: "Message us on WhatsApp",
    description: "Tell us which account it is and what happened. Screenshots of any message from Meta help.",
    icon: "💬",
  },
  {
    title: "We assess your case",
    description:
      "We work out what went wrong and tell you the fee before anything starts. Package clients pay no recovery fee for covered accounts.",
    icon: "🔍",
  },
  {
    title: "We handle the recovery",
    description: "We guide you through Meta's recovery and appeal process and keep you updated on WhatsApp.",
    icon: "⚙️",
  },
];

const checklistPreview = [
  "Selfie verification added",
  "Date of birth is correct",
  "Unknown devices logged out",
  "Two-factor authentication on",
];

export default async function HowItWorksPage() {
  const t = await getT();
  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="max-w-xl">
              <Eyebrow>{t("How It Works")}</Eyebrow>
              <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
                {t("Protect your account first.")}{" "}
                <span className="text-brand-600">{t("If anything happens, we recover it.")}</span>
              </h1>
              <p className="mt-5 text-lg text-ink-600">
                {t(
                  "MetaShield keeps your Instagram, Facebook and ad accounts safe — and when something goes wrong, our team handles the recovery with you on WhatsApp."
                )}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/pricing#packages" size="lg">{t("See protection packages")}</ButtonLink>
                <ButtonLink href={recoveryWhatsappUrl()} target="_blank" variant="outline" size="lg">
                  {t("Start recovery on WhatsApp")}
                </ButtonLink>
              </div>
            </div>

            {/* Right — what a protected account looks like */}
            <div className="relative">
              <Card className="p-6 shadow-xl shadow-brand-900/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-brand-700">{t("MetaShield Elite")}</p>
                    <p className="mt-1 text-base font-semibold text-ink-900">{t("Your protection checklist")}</p>
                  </div>
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                    {t("Protected")}
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  {checklistPreview.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-medium text-ink-800">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {t(item)}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 rounded-xl bg-brand-50 px-3 py-2.5 text-xs text-brand-800">
                  {t("🛡️ Locked out later? Message us on WhatsApp — recovery is included in your package.")}
                </div>
              </Card>
              <div className="absolute -right-4 -top-4 rounded-xl border border-green-100 bg-white px-4 py-2.5 shadow-lg">
                <p className="text-xs font-semibold text-green-600">{t("🎁 First month")}</p>
                <p className="text-sm font-bold text-ink-900">{t("Free")}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Protection steps */}
      <Section>
        <SectionHeading
          eyebrow={t("Account protection")}
          title={t("How MetaShield protects you")}
          description={t("Four simple steps, so problems are caught early — and handled fast if they happen.")}
          align="center"
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {protectionSteps.map((item, i) => (
            <div key={item.title} className="relative rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${item.color}`}>
                  {item.icon}
                </span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-ink-900">{t(item.title)}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{t(item.description)}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <ButtonLink href="/pricing#packages" size="lg">{t("Start my free month")}</ButtonLink>
        </div>
      </Section>

      {/* Recovery on WhatsApp */}
      <Section className="bg-ink-50/50">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>{t("Already locked out?")}</Eyebrow>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              {t("Recovery happens on WhatsApp")}
            </h2>
            <p className="mt-4 text-ink-500">
              {t("Whether you have a package or not, message us on WhatsApp and our team takes it from there.")}
            </p>
            <div className="mt-8 space-y-5">
              {recoverySteps.map((step, i) => (
                <div key={step.title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-xl">
                    {step.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      {i + 1}. {t(step.title)}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-500">{t(step.description)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <ButtonLink href={recoveryWhatsappUrl()} target="_blank" size="lg">{t("Start recovery on WhatsApp")}</ButtonLink>
            </div>
          </div>

          <Card className="p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Z" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold text-ink-900">{t("MetaShield Recovery")}</p>
                <p className="text-xs text-ink-500">{t("WhatsApp · 0816 191 4010")}</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm bg-[#dcf8c6] px-4 py-2.5 text-ink-800">
                {t("Hello MetaShield, I need help recovering my Instagram account.")}
              </p>
              <p className="w-fit max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-ink-800 shadow-sm ring-1 ring-ink-100">
                {t("Hi! Sorry about that. What happened, and do you have a screenshot of any message from Instagram?")}
              </p>
            </div>
            <p className="mt-6 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
              {t("We will never ask for your password. Recovery isn't guaranteed — Meta makes the final decision.")}
            </p>
          </Card>
        </div>
      </Section>

      {/* CTA */}
      <Section className="pb-24">
        <div className="rounded-3xl bg-brand-600 px-8 py-14 text-center sm:px-16">
          <h2 className="text-balance text-3xl font-bold text-white sm:text-4xl">{t("Ready to get started?")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-brand-100">
            {t("Start with a free month of protection — or message us on WhatsApp if your account is already locked.")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/pricing#packages" size="lg" className="bg-white text-brand-700 hover:bg-brand-50">
              {t("See protection packages")}
            </ButtonLink>
            <ButtonLink href={recoveryWhatsappUrl()} target="_blank" size="lg" variant="outline" className="!border-white/40 !text-white hover:!bg-white/10">
              {t("Start recovery on WhatsApp")}
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
