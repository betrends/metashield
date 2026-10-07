import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { brandName, contact } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Terms of Service"),
    description: t("Terms governing your use of {brand}'s account recovery and protection services.", { brand: brandName }),
  };
}

// Bodies use {brand} and {email} placeholders so the English text
// doubles as the translation key (see src/lib/i18n).
const sections = [
  {
    heading: "1. About these terms",
    body: `These Terms of Service ("Terms") govern your use of the services provided by {brand} ("we", "us", "our"), operating from Lagos, Nigeria. By registering for an account, submitting a case, or purchasing any service, you agree to these Terms in full.

If you do not agree, please do not use our services.`,
  },
  {
    heading: "2. Our services",
    body: `{brand} provides the following services to individuals and businesses:

• Account Recovery — we assist with the manual review process for suspended or disabled Instagram and Facebook accounts, preparing and submitting cases to Meta's specialised review team on your behalf.

• Account Protection — ongoing monitoring, health assessments, policy-risk reviews, security checks, and monthly reports designed to reduce the risk of future account issues.

• Emergency Security Response — rapid incident triage and guidance for subscribers who experience an active security incident such as a hack, unauthorised access, impersonation, or account restriction.

• Account Health Check — an assessment of your account's risk level across policy, security, and health indicators.`,
  },
  {
    heading: "3. How the recovery process works",
    body: `When an Instagram or Facebook account is suspended or disabled, there are two main review pathways:

The first is the standard self-appeal process, where you personally submit an appeal through Instagram or Facebook. If that appeal is rejected or the account remains disabled, a second-level review may become necessary.

The second pathway is a manual review handled by a specialised Meta review team. This is the process we assist with.

To begin, you will fill out a form with your account details and information related to the issue. Once submitted, your case and supporting documents are prepared and forwarded for professional review.

The recovery process typically takes up to 9 weeks, depending on the severity of the issue and Meta's own review timeline. Cases may resolve sooner or take longer — we will keep you updated throughout.`,
  },
  {
    heading: "4. No guarantee of outcome",
    body: `Account recovery outcomes depend entirely on the decisions of the relevant platform. {brand} does not own, operate, or have any special relationship with Instagram, Facebook, or Meta. We cannot guarantee that any account will be restored, reactivated, or unrestricted.

Based on our experience handling previous cases, the estimated success rate for eligible recovery cases is approximately 90%. This is an estimate based on historical outcomes — it is not a guarantee and individual results will vary depending on the nature of the issue, account history, and the platform's review decision.

"Protection" and "monitoring" services reduce risk — they do not provide immunity from platform enforcement actions.`,
  },
  {
    heading: "5. Payments, deposits and refunds",
    body: `All fees are quoted in Nigerian Naira (₦) and are due before or at the commencement of work.

Deposit payment: a 50% deposit of the total case fee is required before the recovery process begins. This deposit is non-refundable, as it covers the professional time and resources committed to preparing and submitting your case.

Full upfront payment: clients who choose to pay the full case fee upfront before the process begins are covered by our outcome-based refund policy: if the recovery is unsuccessful, 50% of the total amount paid will be refunded. The remaining 50% is retained to cover the work performed.

Subscription plans: monthly or annual subscription plans are billed at the price shown at the time of sign-up and renew automatically unless cancelled before the renewal date. Subscription fees are not refundable for the current billing period.

All payments are processed securely by Korapay. We do not store your card details. If you believe you were charged in error, contact {email} within 7 days.`,
  },
  {
    heading: "6. Exclusivity during the review process",
    body: `IMPORTANT: Once the recovery process has been initiated and your case has been submitted for review, you are not permitted to seek or engage any other account recovery service, consultant, or third party for the same account until the review process is fully completed.

Using multiple recovery services simultaneously may interfere with the review process and could negatively affect or invalidate the outcome of your case. Breach of this condition will void any refund entitlement and {brand} will not be liable for any adverse outcome resulting from such interference.`,
  },
  {
    heading: "7. What we require from you",
    body: `To use our services, you agree to:

• Provide accurate, complete, and truthful information about yourself and the accounts you are asking us to assist with
• Only request assistance with accounts you own or are legitimately authorised to manage
• Upload only documents and evidence you are legally entitled to share
• Never provide your social media password to us or to anyone claiming to represent us — we will never ask for it
• Cooperate promptly when we request additional information, documents, or approvals needed to progress your case
• Notify us immediately if the status of an account changes materially while we are working on it
• Comply with the exclusivity requirement in section 6 above`,
  },
  {
    heading: "8. Cancellation",
    body: `You may cancel a subscription at any time from the Subscriptions section of your client portal. Cancellation takes effect at the end of your current billing period. You will not receive a prorated refund for unused time.

For active recovery cases, cancellation after submission does not entitle you to a refund of the deposit or any fees paid, as work will already have commenced.

We may suspend or terminate your account if you violate these Terms, provide false information, or use our services for unlawful purposes.`,
  },
  {
    heading: "9. Independent service — no platform affiliation",
    body: `{brand} is an independent account-support service. We are not affiliated with, endorsed by, employed by, or partnered with Meta, Instagram, Facebook, TikTok, YouTube, Google, or any other platform, unless explicitly stated for a specific service.

We use professional knowledge and experience to navigate official support and review channels — the same channels available to any individual or business.`,
  },
  {
    heading: "10. Confidentiality",
    body: `We treat all information you share with us as confidential and will not disclose your account details, case information, or identity to third parties except as described in our Privacy Policy or required by law.

We ask that you treat any advice, strategies, templates, or materials we provide as confidential and do not redistribute them.`,
  },
  {
    heading: "11. Limitation of liability",
    body: `To the fullest extent permitted by Nigerian law, {brand}'s total liability to you for any claim shall not exceed the amount you paid us in the 3 months preceding the claim.

We are not liable for: platform decisions, platform policy changes, loss of followers, loss of advertising spend, loss of revenue arising from account downtime, or any indirect or consequential loss.`,
  },
  {
    heading: "12. Governing law",
    body: `These Terms are governed by the laws of the Federal Republic of Nigeria. Any dispute that cannot be resolved amicably will be referred to the courts of Lagos State, Nigeria.`,
  },
  {
    heading: "13. Changes to these terms",
    body: `We may update these Terms from time to time. Material changes will be communicated to registered clients by email at least 14 days before they take effect. Continued use of our services after that date constitutes acceptance of the updated Terms.`,
  },
  {
    heading: "14. Contact",
    body: `Questions about these Terms can be sent to {email}. We aim to respond within 2 business days.`,
  },
];

export default async function TermsPage() {
  const t = await getT();
  return (
    <>
      <section className="bg-brand-glow">
        <Container className="py-16 sm:py-20">
          <div className="max-w-2xl">
            <Eyebrow>{t("Terms of Service")}</Eyebrow>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink-900 text-balance">{t("The terms behind our services.")}</h1>
            <p className="mt-4 text-sm text-ink-500">{t("Last updated: 21 September 2026  ·  Effective: 21 September 2026")}</p>
            <p className="mt-3 text-sm text-ink-600">{t("Please read these terms carefully before using")}{" "}{brandName}{t("'s services. They set out your rights, our responsibilities, and the basis on which we work together.")}</p>
          </div>
        </Container>
      </section>

      <Section className="pb-24">
        <div className="max-w-2xl space-y-10">
          {/* Highlight box for the exclusivity clause */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">{t("Important notice")}</p>
            <p className="mt-1.5 text-sm text-amber-900">{t("Once your recovery case has been submitted for review, you must not engage any other recovery service until the process is complete. Doing so may harm your case and void your refund entitlement. See section 6.")}</p>
          </div>

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
