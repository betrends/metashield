import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Resources"),
    description:
      t("Guides on account security, platform policy and staying compliant to reduce the risk of restrictions."),
  };
}

// TODO before launch: replace with real published guides. Listed here as
// a content roadmap so the Resources hub has a clear structure from day one.
const resourceGroups = [
  {
    category: "Prevention",
    items: [
      {
        title: "5 account behaviors that commonly trigger restrictions",
        description:
          "What tends to draw platform attention, and how to avoid it.",
      },
      {
        title: "Setting up two-factor authentication the right way",
        description: "A practical walkthrough for personal and business accounts.",
      },
      {
        title: "A pre-launch checklist for new ad accounts",
        description: "Reduce early flags before you start spending.",
      },
    ],
  },
  {
    category: "Platform policy",
    items: [
      {
        title: "Understanding Meta's account integrity system",
        description: "A plain-language explainer of how enforcement generally works.",
      },
      {
        title: "Business Manager verification, explained",
        description: "What verification actually checks, and common failure points.",
      },
    ],
  },
  {
    category: "If something's already wrong",
    items: [
      {
        title: "What to do in the first hour after a disable notice",
        description: "The steps that matter most before you appeal.",
      },
      {
        title: "Preparing evidence for a stronger appeal",
        description: "What to gather, and how to present it clearly.",
      },
    ],
  },
];

export default async function ResourcesPage() {
  const t = await getT();
  return (
    <>
      <section className="bg-brand-glow">
        <Container className="py-16 sm:py-20">
          <div className="max-w-2xl">
            <Eyebrow>{t("Resources")}</Eyebrow>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl text-balance">{t("Practical guidance on account security & platform policy.")}</h1>
            <p className="mt-5 text-lg text-ink-600 text-balance">{t("Free guides to help you reduce risk on your own — and to give you context before you ever need a recovery case.")}</p>
          </div>
        </Container>
      </section>

      {resourceGroups.map((group, index) => (
        <Section key={group.category} className={index % 2 === 1 ? "bg-ink-50/50" : ""}>
          <SectionHeading title={t(group.category)} />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <Card key={item.title} className="flex flex-col">
                <span className="inline-flex w-fit items-center rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-500">{t("Coming soon")}</span>
                <h3 className="mt-3 text-base font-semibold text-ink-900">
                  {t(item.title)}
                </h3>
                <p className="mt-2 text-sm text-ink-500">{t(item.description)}</p>
              </Card>
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}
