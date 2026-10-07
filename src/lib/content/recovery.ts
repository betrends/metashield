export type RecoveryIssue = {
  slug: string;
  problem: string;
  diagnosis: string;
  process: string[];
  timeline: string;
  requirements: string[];
};

export type RecoveryPlatform = {
  slug: string;
  platform: string;
  summary: string;
  issues: RecoveryIssue[];
};

export const recoveryPlatforms: RecoveryPlatform[] = [
  {
    slug: "instagram",
    platform: "Instagram",
    summary:
      "From disabled accounts to repeatedly rejected appeals, we handle Instagram account issues end to end.",
    issues: [
      {
        slug: "disabled-accounts",
        problem: "Disabled accounts",
        diagnosis:
          "Your account was deactivated by Instagram, usually after a policy violation, an automated system flag, or a mass-reporting incident.",
        process: [
          "Free intake review of your account status and any notices you've received",
          "We identify the likely disable reason and appeal pathway",
          "We prepare and submit a structured appeal with supporting evidence",
          "We track the appeal and follow up until a resolution is reached",
        ],
        timeline: "Typically 3–14 days, depending on case complexity",
        requirements: [
          "Government ID where legitimately required by the platform",
          "Screenshots of the disable notice",
          "Any prior correspondence from Instagram",
        ],
      },
      {
        slug: "suspended-accounts",
        problem: "Suspended accounts",
        diagnosis:
          "A temporary or indefinite suspension tied to a specific policy flag (e.g. spam, impersonation, or community guideline reports).",
        process: [
          "Review the suspension notice and account history",
          "Identify corrective actions needed before appeal",
          "Submit the appeal with context and evidence",
          "Monitor for platform response",
        ],
        timeline: "Typically 2–10 days",
        requirements: ["Account status screenshot", "Warning message screenshots"],
      },
      {
        slug: "account-integrity-restrictions",
        problem: "Account integrity restrictions",
        diagnosis:
          "Reduced reach, posting limits or feature restrictions applied after an integrity review — often unclear from the app alone.",
        process: [
          "Diagnose which integrity signal likely triggered the restriction",
          "Advise on account behavior changes",
          "Submit a review request where available",
          "Monitor account status until restrictions lift",
        ],
        timeline: "Typically 5–21 days",
        requirements: ["Screenshots of any in-app restriction notices"],
      },
      {
        slug: "hacked-accounts",
        problem: "Hacked / compromised accounts",
        diagnosis:
          "Unauthorized access, changed login details, or suspicious activity you no longer control.",
        process: [
          "Guide you through Instagram's official regain-access flow",
          "Help verify ownership using account history and documentation",
          "Advise on securing the account once access is restored",
          "Never request your password at any stage",
        ],
        timeline: "Typically 1–7 days for straightforward cases",
        requirements: ["Proof of ownership", "Original sign-up email if available"],
      },
      {
        slug: "login-access-problems",
        problem: "Login / access problems",
        diagnosis:
          "Two-factor or verification issues, lost access to a linked email/phone, or unclear in-app blockers.",
        process: [
          "Diagnose the specific access blocker",
          "Walk through platform-supported recovery options",
          "Escalate where a structured case is required",
        ],
        timeline: "Typically 1–5 days",
        requirements: ["Proof of ownership", "Access to any linked recovery contact"],
      },
      {
        slug: "rejected-appeals",
        problem: "Repeatedly rejected appeals",
        diagnosis:
          "Prior self-submitted appeals were declined, often due to incomplete evidence or an unclear case narrative.",
        process: [
          "Audit prior appeal attempts to identify gaps",
          "Rebuild a stronger, evidence-backed case",
          "Submit through the appropriate channel",
          "Track and follow up on the new submission",
        ],
        timeline: "Varies by case history",
        requirements: ["Records of previous appeal attempts and responses"],
      },
    ],
  },
  {
    slug: "facebook",
    platform: "Facebook",
    summary:
      "Support for disabled profiles, restricted or suspended Pages, and Business Page issues.",
    issues: [
      {
        slug: "disabled-profiles",
        problem: "Disabled profiles",
        diagnosis:
          "Personal profile deactivated after a policy flag, identity check, or mass reporting.",
        process: [
          "Review the disable notice and account context",
          "Prepare identity verification where required",
          "Submit a structured appeal",
          "Track the case to resolution",
        ],
        timeline: "Typically 5–21 days",
        requirements: ["Government ID where legitimately required", "Disable notice screenshot"],
      },
      {
        slug: "restricted-pages",
        problem: "Restricted Pages",
        diagnosis:
          "Reduced distribution, publishing limits or feature locks applied to a Page after a policy review.",
        process: [
          "Diagnose the restriction type and likely cause",
          "Review Page roles and recent activity",
          "Submit a review request where available",
        ],
        timeline: "Typically 5–14 days",
        requirements: ["Screenshots of the restriction notice", "Page admin access"],
      },
      {
        slug: "suspended-accounts-fb",
        problem: "Suspended accounts",
        diagnosis: "Full account suspension tied to a specific policy violation.",
        process: [
          "Review suspension details",
          "Prepare and submit an appeal with evidence",
          "Monitor for a platform decision",
        ],
        timeline: "Typically 5–21 days",
        requirements: ["Warning or suspension notice", "Proof of identity if requested"],
      },
      {
        slug: "business-page-issues",
        problem: "Business Page issues",
        diagnosis:
          "Ownership disputes, unpublished Pages, or Page-level restrictions affecting a business.",
        process: [
          "Confirm business ownership documentation",
          "Diagnose the specific Page-level issue",
          "Submit the appropriate business verification or review request",
        ],
        timeline: "Typically 7–21 days",
        requirements: ["Business registration documents", "Proof of Page ownership"],
      },
    ],
  },
  {
    slug: "meta-business",
    platform: "Meta Business",
    summary:
      "Business Manager, Business Portfolio and advertising access issues for teams and agencies.",
    issues: [
      {
        slug: "business-manager-restrictions",
        problem: "Business Manager restrictions",
        diagnosis:
          "Business Manager flagged or restricted, limiting access to Pages, ad accounts or assets.",
        process: [
          "Audit Business Manager structure, admins and asset history",
          "Identify the likely trigger for the restriction",
          "Submit the appropriate review with supporting documentation",
        ],
        timeline: "Typically 7–30 days",
        requirements: ["Business registration documents", "Admin access to Business Manager"],
      },
      {
        slug: "business-portfolio-issues",
        problem: "Business Portfolio issues",
        diagnosis:
          "Verification failures, ownership conflicts, or portfolio-level access problems.",
        process: [
          "Review portfolio verification status",
          "Resolve ownership or admin conflicts",
          "Resubmit verification where required",
        ],
        timeline: "Typically 7–30 days",
        requirements: ["Business registration documents", "Domain or brand verification proof"],
      },
      {
        slug: "ad-account-restrictions",
        problem: "Ad account restrictions",
        diagnosis:
          "Spend limits, disapproved ads at scale, or a fully restricted ad account after a policy review.",
        process: [
          "Review recent ad activity and policy flags",
          "Identify corrective actions",
          "Submit a review request with evidence",
        ],
        timeline: "Typically 5–21 days",
        requirements: ["Ad account screenshots", "Recent ad copy/creative if requested"],
      },
      {
        slug: "advertising-access-problems",
        problem: "Advertising access problems",
        diagnosis:
          "Payment, verification, or permissions issues preventing normal advertising activity.",
        process: [
          "Diagnose the specific access blocker",
          "Advise on required verification steps",
          "Escalate where a structured review is needed",
        ],
        timeline: "Typically 3–14 days",
        requirements: ["Business Manager screenshots", "Payment method verification status"],
      },
      {
        slug: "page-asset-restrictions",
        problem: "Page / asset restrictions",
        diagnosis:
          "Individual assets (Pages, catalogs, pixels) restricted within an otherwise active Business Manager.",
        process: [
          "Identify the specific restricted asset and cause",
          "Review asset-level permissions and history",
          "Submit the relevant appeal or review request",
        ],
        timeline: "Typically 5–21 days",
        requirements: ["Business Manager screenshots", "Asset ownership confirmation"],
      },
    ],
  },
];

export const platformIcons: Record<string, string> = {
  instagram: "IG",
  facebook: "FB",
  "meta-business": "MB",
};
