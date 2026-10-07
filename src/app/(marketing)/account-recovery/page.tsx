import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Section, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { recoveryPlatforms } from "@/lib/content/recovery";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Account Recovery"),
    description:
      t("Professional recovery support for disabled, suspended, restricted or hacked Instagram, Facebook and Meta Business accounts."),
  };
}

const platformIcons: Record<string, string> = {
  Instagram: "📸",
  Facebook: "💙",
  "Meta Business": "🏢",
  TikTok: "🎵",
  "Google Ads": "🔍",
};

const steps = [
  { label: "Problem", icon: "🔴" },
  { label: "Diagnosis", icon: "🔍" },
  { label: "Process", icon: "⚙️" },
  { label: "Timeline", icon: "📅" },
  { label: "Requirements", icon: "📋" },
  { label: "Resolution", icon: "✅" },
];

export default async function AccountRecoveryPage() {
  const t = await getT();
  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left — text */}
            <div className="max-w-xl">
              <Eyebrow>{t("Account Recovery")}</Eyebrow>
              <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">{t("Get your account back — with a")}{" "}
                <span className="text-brand-600">{t("clear process")}</span>{t(", not guesswork.")}</h1>
              <p className="mt-5 text-lg text-ink-600">{t("Every recovery case follows the same structured path. Pick your platform below to see exactly how we approach your issue.")}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/recovery-eligibility" size="lg">{t("Check Recovery Eligibility")}</ButtonLink>
                <ButtonLink href="/contact" variant="outline" size="lg">{t("Talk to Our Team")}</ButtonLink>
              </div>

              {/* Platform quick links */}
              <div className="mt-10 flex flex-wrap gap-2">
                {recoveryPlatforms.map((platform) => (
                  <a
                    key={platform.slug}
                    href={`#${platform.slug}`}
                    className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 shadow-sm transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <span>{platformIcons[platform.platform] ?? "🛡️"}</span>
                    {t(platform.platform)}
                  </a>
                ))}
              </div>
            </div>

            {/* Right — process flow card */}
            <div className="relative">
              <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-xl shadow-brand-900/5">
                <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-brand-600">{t("Our Recovery Path")}</p>
                <div className="space-y-3">
                  {steps.map((step, i) => (
                    <div key={step.label} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg">
                        {step.icon}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-ink-900">
                            {t(step.label)}
                          </span>
                          <span className="text-xs text-ink-400">{t("Step")}{" "}{i + 1}
                          </span>
                        </div>
                        {i < steps.length - 1 && (
                          <div className="mt-2 h-px w-full bg-gradient-to-r from-brand-100 to-transparent" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white">{t("🛡️ No recovery, no charge for intake")}</div>
              </div>

              {/* Floating stat */}
              <div className="absolute -right-4 -top-4 rounded-xl border border-green-100 bg-white px-4 py-2.5 shadow-lg">
                <p className="text-xs font-semibold text-green-600">{t("✅ Success rate")}</p>
                <p className="text-xl font-bold text-ink-900">{t("High")}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Platform sections */}
      {recoveryPlatforms.map((platform, index) => (
        <Section
          key={platform.slug}
          id={platform.slug}
          className={`scroll-mt-16 ${index % 2 === 1 ? "bg-ink-50/50" : "bg-white"}`}
        >
          {/* Platform header */}
          <div className="mb-8 flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-2xl">
              {platformIcons[platform.platform] ?? "🛡️"}
            </span>
            <div>
              <h2 className="text-2xl font-bold text-ink-900">
                {t("{platform} Recovery", { platform: t(platform.platform) })}</h2>
              <p className="mt-1 text-sm text-ink-500">{t(platform.summary)}</p>
            </div>
          </div>

          {/* Issues accordion */}
          <div className="space-y-3">
            {platform.issues.map((issue) => (
              <details
                key={issue.slug}
                className="group rounded-2xl border border-ink-100 bg-white shadow-sm open:shadow-md open:border-brand-200"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 2.5 4 6v6c0 5.1 3.4 8.9 8 9.5 4.6-.6 8-4.4 8-9.5V6l-8-3.5Z"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="text-base font-semibold text-ink-900">
                      {t(issue.problem)}
                    </span>
                  </div>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="shrink-0 text-ink-400 transition-transform group-open:rotate-45"
                  >
                    <path
                      d="M12 5v14M5 12h14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </summary>

                <div className="grid gap-8 border-t border-ink-100 px-6 py-6 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-span-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{t("Diagnosis")}</p>
                      <p className="mt-2 text-sm leading-relaxed text-ink-600">
                        {t(issue.diagnosis)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{t("Our Process")}</p>
                      <ol className="mt-3 space-y-2.5">
                        {issue.process.map((step, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 text-sm text-ink-600"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                              {i + 1}
                            </span>
                            {t(step)}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-xl bg-ink-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{t("Expected Timeline")}</p>
                      <p className="mt-1.5 text-sm font-medium text-ink-800">
                        {t(issue.timeline)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{t("What You'll Need")}</p>
                      <ul className="mt-2 space-y-2">
                        {issue.requirements.map((req) => (
                          <li
                            key={req}
                            className="flex items-start gap-2 text-sm text-ink-600"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              className="mt-0.5 shrink-0 text-brand-500"
                            >
                              <path
                                d="M20 6 9 17l-5-5"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            {t(req)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <ButtonLink
                      href="/recovery-eligibility"
                      size="sm"
                      className="w-full"
                    >{t("Start This Recovery →")}</ButtonLink>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </Section>
      ))}

      {/* Bottom CTA */}
      <Section className="pb-24">
        <div className="rounded-3xl bg-brand-600 px-8 py-14 text-center sm:px-16">
          <h2 className="text-balance text-3xl font-bold text-white sm:text-4xl">{t("Don't see your exact issue?")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-brand-100">{t("We handle a wide range of account issues across Instagram, Facebook and Meta Business. Reach out and we'll assess your specific case — free initial review.")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/contact" size="lg" variant="outline">{t("Contact Our Team")}</ButtonLink>
            <ButtonLink href="/recovery-eligibility" size="lg" className="bg-white text-brand-700 hover:bg-brand-50">{t("Check Eligibility Free")}</ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
