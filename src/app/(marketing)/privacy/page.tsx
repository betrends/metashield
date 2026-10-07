import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { brandName, contact } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Privacy Policy"),
    description: t("How {brand} collects, uses and protects your personal information in accordance with the Nigeria Data Protection Act 2023.", { brand: brandName }),
  };
}

// Bodies use {brand} and {email} placeholders so the English text
// doubles as the translation key (see src/lib/i18n).
const sections = [
  {
    heading: "1. Who we are",
    body: `{brand} ("we", "us", "our") is an account recovery and protection service operating from Lagos, Nigeria. We help individuals and businesses recover, protect, and manage their social media and digital accounts. Our website is metashield.online.

For questions about this policy, contact our Data Protection Officer at {email}.`,
  },
  {
    heading: "2. What information we collect",
    body: `We collect information you provide directly to us, including:

• Your name, email address, and phone number when you register or contact us
• Account handles, platform names, and follower/audience details relevant to your case
• Documents, screenshots, and identification you upload as evidence for a recovery case
• Payment information (processed securely by Korapay — we do not store card details)
• Messages, notes, and attachments sent through your client portal
• IP address, browser type, and session data collected automatically when you use our site`,
  },
  {
    heading: "3. What we never ask for",
    body: `We will never ask for your social media password, PIN, or two-factor authentication codes. If anyone claiming to represent {brand} asks for your password, do not provide it and contact us immediately at {email}.`,
  },
  {
    heading: "4. How we use your information",
    body: `We use the information we collect to:

• Assess your case and provide account recovery or protection services
• Communicate with you about the status of your case and your account
• Process payments for our services through Korapay
• Send you security alerts, monthly reports, and service updates (where you have subscribed)
• Comply with our legal obligations under Nigerian law
• Improve our services and protect against fraud or misuse`,
  },
  {
    heading: "5. Legal basis for processing",
    body: `We process your personal data on the following grounds under the Nigeria Data Protection Act 2023 (NDPA):

• Contract: processing is necessary to deliver the services you have requested
• Legitimate interest: fraud prevention, security monitoring, and service improvement
• Consent: for optional communications such as newsletters or tips (you can withdraw at any time)
• Legal obligation: where Nigerian law requires us to retain or disclose information`,
  },
  {
    heading: "6. Who we share your information with",
    body: `We do not sell your personal information. We may share it only with:

• Trusted service providers operating on our behalf (Supabase for secure data storage, Korapay for payment processing, Resend for transactional email) — each under a data processing agreement
• Our assigned agents and case handlers who need access to work your case
• Law enforcement or regulatory authorities where required by Nigerian law
• A successor entity if {brand} is ever acquired or merged — you will be notified`,
  },
  {
    heading: "7. International data transfers",
    body: `Some of our service providers (Supabase, Resend) may store or process data outside Nigeria. Where this occurs, we ensure appropriate safeguards are in place consistent with the NDPA 2023 and the Nigeria Data Protection Regulation (NDPR).`,
  },
  {
    heading: "8. Data retention",
    body: `We retain your personal information only for as long as necessary to deliver our services and fulfil legal obligations:

• Active account and case data: for the duration of your engagement with us plus 2 years
• Payment records: 7 years (for financial and tax compliance under Nigerian law)
• Security logs: 12 months

You may request earlier deletion — see section 10 below.`,
  },
  {
    heading: "9. Security",
    body: `We take reasonable technical and organisational measures to protect your information, including encrypted storage, access controls, and secure connections (HTTPS). No system is completely secure; if you believe your account has been compromised, contact us immediately.`,
  },
  {
    heading: "10. Your rights",
    body: `Under the NDPA 2023, you have the right to:

• Access — request a copy of the personal data we hold about you
• Correction — ask us to correct inaccurate information
• Deletion — ask us to delete your data (subject to legal retention requirements)
• Portability — receive your data in a portable format
• Objection — object to certain types of processing
• Withdraw consent — at any time, for consent-based processing

To exercise any of these rights, email {email}. We will respond within 30 days.`,
  },
  {
    heading: "11. Cookies",
    body: `We use only essential cookies required to operate the site and keep you signed in to your portal. We do not use tracking or advertising cookies. You can disable cookies in your browser settings, but this may affect how the portal works.`,
  },
  {
    heading: "12. Children",
    body: `Our services are intended for individuals aged 18 and over. We do not knowingly collect personal data from children. If you believe a child has provided us with their information, please contact us and we will delete it promptly.`,
  },
  {
    heading: "13. Changes to this policy",
    body: `We may update this policy from time to time. When we do, we will revise the "Last updated" date at the top of this page. Material changes will be communicated to registered clients by email.`,
  },
  {
    heading: "14. Contact & complaints",
    body: `For any privacy questions or to exercise your rights, contact us at {email}.

If you are unsatisfied with our response, you have the right to lodge a complaint with the Nigeria Data Protection Commission (NDPC) at ndpc.gov.ng.`,
  },
];

export default async function PrivacyPage() {
  const t = await getT();
  return (
    <>
      <section className="bg-brand-glow">
        <Container className="py-16 sm:py-20">
          <div className="max-w-2xl">
            <Eyebrow>{t("Privacy Policy")}</Eyebrow>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink-900 text-balance">{t("Your information, handled carefully.")}</h1>
            <p className="mt-4 text-sm text-ink-500">{t("Last updated: 21 September 2026  ·  Effective: 21 September 2026")}</p>
            <p className="mt-3 text-sm text-ink-600">{t("This policy explains how")}{" "}{brandName}{" "}{t("collects, uses, and protects your personal information in accordance with the Nigeria Data Protection Act 2023 (NDPA) and the Nigeria Data Protection Regulation (NDPR).")}</p>
          </div>
        </Container>
      </section>

      <Section className="pb-24">
        <div className="max-w-2xl space-y-10">
          {sections.map((s) => (
            <div key={s.heading}>
              <h2 className="text-base font-semibold text-ink-900">{t(s.heading)}</h2>
              <div className="mt-2 space-y-2">
                {s.body.split("\n\n").map((para, i) => (
                  <p key={i} className="text-sm leading-relaxed text-ink-600 whitespace-pre-line">
                    {t(para, { brand: brandName, email: contact.email })}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
