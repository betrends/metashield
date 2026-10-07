import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Section, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import dynamic from "next/dynamic";
const ContactForm = dynamic(() => import("@/components/ContactForm").then(m => m.ContactForm));
import { contact } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Contact"),
    description: t("Get in touch about an account recovery, protection or business case."),
  };
}

const contactMethods = [
  { label: "Email", value: contact.email },
  { label: "Phone", value: contact.phone },
  { label: "Location", value: contact.address },
];

export default async function ContactPage() {
  const t = await getT();
  return (
    <>
      <section className="bg-brand-glow">
        <Container className="py-16 sm:py-20">
          <div className="max-w-2xl">
            <Eyebrow>{t("Contact")}</Eyebrow>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl text-balance">{t("Tell us what's going on — we'll take it from there.")}</h1>
            <p className="mt-5 text-lg text-ink-600 text-balance">{t("For a faster path, try the")}{" "}
              <Link href="/recovery-eligibility" className="font-semibold text-brand-700 hover:text-brand-800">{t("Recovery Eligibility Checker")}</Link>{" "}{t("or")}{" "}
              <Link href="/check-my-account" className="font-semibold text-brand-700 hover:text-brand-800">{t("Account Health Check")}</Link>{t(". Otherwise, send us a message below.")}</p>
          </div>
        </Container>
      </section>

      <Section className="pb-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{t("Get in touch")}</h2>
            <dl className="mt-5 space-y-4">
              {contactMethods.map((method) => (
                <div key={method.label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    {t(method.label)}
                  </dt>
                  <dd className="mt-1 text-sm text-ink-800">{t(method.value)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 text-sm text-ink-500">{t("We typically respond within 24 hours. For urgent business or ad account issues, mention it in your message and we'll prioritize accordingly.")}</p>
          </div>
          <ContactForm />
        </div>
      </Section>
    </>
  );
}
