import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("How It Works"),
    description:
      t("The full case journey from new lead to resolution — with clear status updates at every stage, so you're never left guessing."),
  };
}

const workflowStages = [
  { stage: "New Lead", description: "You submit a case or complete the eligibility checker.", icon: "📩", color: "bg-blue-100 text-blue-700" },
  { stage: "Assessment Pending", description: "Our team reviews the details you've provided.", icon: "🔍", color: "bg-amber-100 text-amber-700" },
  { stage: "Payment Pending", description: "Once assessed, you'll receive a quote and next steps.", icon: "💳", color: "bg-purple-100 text-purple-700" },
  { stage: "Documents Required", description: "We request any evidence or documentation needed.", icon: "📋", color: "bg-orange-100 text-orange-700" },
  { stage: "Under Review", description: "Your case and documents are reviewed against platform requirements.", icon: "⚖️", color: "bg-indigo-100 text-indigo-700" },
  { stage: "Recovery Process", description: "We prepare and submit your appeal or recovery request.", icon: "⚙️", color: "bg-brand-100 text-brand-700" },
  { stage: "Awaiting Platform Response", description: "We monitor for a response and follow up where needed.", icon: "⏳", color: "bg-sky-100 text-sky-700" },
  { stage: "Resolved / Unresolved", description: "You're notified of the outcome, with next steps either way.", icon: "✅", color: "bg-green-100 text-green-700" },
];

const exampleTimeline = [
  { date: "Aug 18", event: "Case submitted", done: true },
  { date: "Aug 18", event: "Documents received", done: true },
  { date: "Aug 19", event: "Initial assessment", done: true },
  { date: "Aug 20", event: "Appeal submitted", done: true },
  { date: "Aug 21", event: "Awaiting response", done: false },
];

const features = [
  {
    title: "Live case tracking",
    description: "See exactly which stage your case is at, without having to message us for an update.",
    icon: "📊",
  },
  {
    title: "Secure messaging",
    description: "Send and receive documents, screenshots and updates in one place — no scattered chats.",
    icon: "💬",
  },
  {
    title: "Document center",
    description: "Upload evidence securely. We will never ask for your social media password.",
    icon: "📁",
  },
];

export default async function HowItWorksPage() {
  const t = await getT();
  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left */}
            <div className="max-w-xl">
              <Eyebrow>{t("How It Works")}</Eyebrow>
              <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">{t("A clear process, from")}{" "}
                <span className="text-brand-600">{t("first message")}</span>{" "}{t("to resolution.")}</h1>
              <p className="mt-5 text-lg text-ink-600">{t("You shouldn't have to chase updates. Every case moves through the same defined stages — and you'll know exactly where things stand at each step.")}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/recovery-eligibility" size="lg">{t("Start Your Case")}</ButtonLink>
                <ButtonLink href="/contact" variant="outline" size="lg">{t("Ask a Question")}</ButtonLink>
              </div>
            </div>

            {/* Right — mini timeline preview */}
            <div className="relative">
              <Card className="p-6 shadow-xl shadow-brand-900/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-brand-700">{t("Case #AG-10482")}</p>
                    <p className="mt-1 text-base font-semibold text-ink-900">{t("Instagram Account Recovery")}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{t("Under Review")}</span>
                </div>
                <ol className="mt-6 space-y-4 border-l-2 border-brand-100 pl-5">
                  {exampleTimeline.map((item, i) => (
                    <li key={i} className="relative">
                      <span
                        className={`absolute -left-[26px] top-1 flex h-3 w-3 items-center justify-center rounded-full ${
                          item.done
                            ? "bg-brand-600 ring-4 ring-brand-100"
                            : "bg-ink-200 ring-4 ring-ink-50"
                        }`}
                      />
                      <p className="text-xs text-ink-400">{t(item.date)}</p>
                      <p
                        className={`text-sm font-medium ${
                          item.done ? "text-ink-800" : "text-ink-400"
                        }`}
                      >
                        {t(item.event)}
                      </p>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 rounded-xl bg-brand-50 px-3 py-2.5 text-xs text-brand-800">{t("🔔 You'll get an email when anything changes.")}</div>
              </Card>

              {/* Floating badge */}
              <div className="absolute -right-4 -top-4 rounded-xl border border-green-100 bg-white px-4 py-2.5 shadow-lg">
                <p className="text-xs font-semibold text-green-600">{t("✅ No guessing")}</p>
                <p className="text-sm font-bold text-ink-900">{t("Always informed")}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Workflow stages */}
      <Section>
        <SectionHeading
          eyebrow={t("Case workflow")}
          title={t("Every case follows the same eight stages")}
          description={t("No surprises, no ambiguity — you know exactly what's happening at each step.")}
          align="center"
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {workflowStages.map((item, i) => (
            <div
              key={item.stage}
              className="relative rounded-2xl border border-ink-100 bg-white p-5 shadow-sm"
            >
              {/* Connector line (desktop) */}
              {i < workflowStages.length - 1 && i % 4 !== 3 && (
                <div className="absolute -right-2.5 top-8 hidden h-px w-5 bg-ink-100 lg:block" />
              )}
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${item.color}`}>
                  {item.icon}
                </span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-ink-900">{t(item.stage)}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{t(item.description)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Portal features */}
      <Section className="bg-ink-50/50">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>{t("What you'll see in your portal")}</Eyebrow>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{t("Log in instead of sending “any update?”")}</h2>
            <p className="mt-4 text-ink-500">{t("Every recovery case gets a running timeline so you always know what's happened and what's next — no chasing required.")}</p>
            <div className="mt-8 space-y-5">
              {features.map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-xl">
                    {feature.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{t(feature.title)}</p>
                    <p className="mt-0.5 text-sm text-ink-500">{t(feature.description)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <ButtonLink href="/portal/login?mode=sign-up" size="lg">{t("Create Your Portal Account")}</ButtonLink>
            </div>
          </div>

          <Card className="p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-brand-700">{t("Case #AG-10482")}</p>
                <p className="mt-1 text-base font-semibold text-ink-900">{t("Instagram Account Recovery")}</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{t("Under Review")}</span>
            </div>
            <ol className="mt-6 space-y-4 border-l-2 border-brand-100 pl-5">
              {exampleTimeline.map((item, i) => (
                <li key={i} className="relative">
                  <span
                    className={`absolute -left-[26px] top-1 flex h-3 w-3 items-center justify-center rounded-full ${
                      item.done
                        ? "bg-brand-600 ring-4 ring-brand-100"
                        : "bg-ink-200 ring-4 ring-ink-50"
                    }`}
                  />
                  <p className="text-xs text-ink-400">{t(item.date)}</p>
                  <p
                    className={`text-sm font-medium ${
                      item.done ? "text-ink-800" : "text-ink-400"
                    }`}
                  >
                    {t(item.event)}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </Section>

      {/* CTA */}
      <Section className="pb-24">
        <div className="rounded-3xl bg-brand-600 px-8 py-14 text-center sm:px-16">
          <h2 className="text-balance text-3xl font-bold text-white sm:text-4xl">{t("Ready to get started?")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-brand-100">{t("Answer a few questions and we'll tell you whether your case is a good fit for professional recovery support — free, no obligation.")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/recovery-eligibility" size="lg" className="bg-white text-brand-700 hover:bg-brand-50">{t("Check Recovery Eligibility")}</ButtonLink>
            <ButtonLink href="/contact" size="lg" variant="outline">{t("Contact Our Team")}</ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
