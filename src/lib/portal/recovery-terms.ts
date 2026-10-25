// Recovery terms shown (and accepted) before a client can pay the deposit.
// Text supplied by MetaShield on 2026-10-25 — do not edit the wording
// without bumping TERMS_VERSION, so every acceptance stays tied to the
// exact text the client agreed to.

export const TERMS_VERSION = "2026-10-25";

export const RECOVERY_TERMS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "Account recovery process",
    paragraphs: [
      "When an Instagram or Facebook account is suspended or disabled, we assist with submitting the case for further review through available Meta support channels.",
      "You’ll complete a recovery form with your account details and information about the issue. The process can take up to 9 weeks, depending on the case and Meta’s review timeline.",
      "Our estimated recovery success rate based on previous cases is approximately 90%, but recovery is not guaranteed as the final decision remains with Meta.",
    ],
  },
  {
    heading: "Payment",
    paragraphs: [
      "A 50% non-refundable deposit is required before we begin. If you pay in full upfront and the recovery is unsuccessful, 50% of the total payment may be refunded under our refund policy.",
      "Once your account is successfully reinstated, the outstanding balance must be paid within 24 hours.",
    ],
  },
  {
    heading: "Important",
    paragraphs: [
      "Once your case has been submitted, you agree not to use another recovery service for the same account while our process is ongoing, as multiple recovery attempts may interfere with the case.",
      "By proceeding, you also give us permission to share your review or testimonial about our service for promotional purposes.",
    ],
  },
  {
    heading: "After recovery — MetaShield",
    paragraphs: [
      "Getting your account back is only the beginning. We want to help you keep your account secure and reduce the risk of future disruptions.",
      "While no service can guarantee that an account will never be suspended again, our MetaShield Account Protection service provides ongoing support and protection after recovery, so you don’t have to navigate future account issues alone.",
      "Recover it. Protect it. Keep your digital presence secure.",
    ],
  },
];
