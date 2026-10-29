// MetaShield packages: the single list every page reads (pricing page,
// Account Protection page, client Billing page, admin). Real subscription
// and invoice state lives in Supabase (subscriptions/invoices tables) —
// see lib/portal/subscriptions.ts.
//
// Card payment (Korapay) stays hidden until NEXT_PUBLIC_KORAPAY_ENABLED is
// "true" in Vercel. Until then clients ask for a package on WhatsApp and the
// admin switches it on from the client's page (Activate package).

export type PlanId = "watch" | "elite" | "annual" | "lifetime";
// Plans sold before October 2026 — only kept so old records still display.
export type LegacyPlanId = "basic" | "professional" | "business" | "one_time";
export type AnyPlanId = PlanId | LegacyPlanId;

export type Period = "month" | "year" | "lifetime";

export type Plan = {
  id: AnyPlanId;
  name: string;
  price: string;
  priceKobo: number;
  priceSuffix?: string;
  period: Period;
  tagline: string;
  description: string;
  features: string[];
  note?: string;
  // Recoveries included at no extra recovery fee (eligible cases).
  covers: { instagram: boolean; facebook: boolean; ads: boolean };
  highlighted?: boolean;
};

export const PACKAGES_HEADLINE = "One Subscription. Account Recovery at No Extra Cost.";

export const PACKAGES_DISCLAIMER =
  "Account recovery is provided at no additional recovery service fee for eligible cases covered by your plan. Recovery, appeal approval, and restriction removal are not guaranteed. Meta makes the final decisions. All packages are subject to MetaShield's terms and conditions.";

export const plans: Plan[] = [
  {
    id: "watch",
    name: "MetaShield Watch",
    price: "₦10,000",
    priceKobo: 10_000_00,
    priceSuffix: "/month",
    period: "month",
    tagline: "Free Instagram & Facebook account recovery",
    description: "For one Instagram and one Facebook account.",
    features: [
      "One registered Instagram account",
      "One registered Facebook account",
      "Help with account access issues",
      "Guidance through available recovery and appeal processes",
      "Monthly account security check",
      "Help with account warnings and security settings",
    ],
    covers: { instagram: true, facebook: true, ads: false },
  },
  {
    id: "elite",
    name: "MetaShield Elite",
    price: "₦15,000",
    priceKobo: 15_000_00,
    priceSuffix: "/month",
    period: "month",
    tagline: "Free account recovery + ad account issue support",
    description: "Instagram, Facebook and one Meta advertising account.",
    features: [
      "One registered Instagram account",
      "One registered Facebook account",
      "One registered Meta advertising account",
      "Help with eligible Meta advertising issues",
      "Guidance on advertising restrictions and access problems",
      "Help understanding available advertising reviews and appeals",
      "Monthly account security check",
      "Priority support during published support hours",
    ],
    note: "Advertising budgets and third-party charges are not included.",
    covers: { instagram: true, facebook: true, ads: true },
  },
  {
    id: "annual",
    name: "MetaShield Annual Plan",
    price: "₦120,000",
    priceKobo: 120_000_00,
    priceSuffix: "/year",
    period: "year",
    tagline: "12 months of account recovery support",
    description: "Two Instagram and two Facebook accounts for a full year.",
    features: [
      "Two registered Instagram accounts",
      "Two registered Facebook accounts",
      "Help with eligible account access issues",
      "Guidance through available recovery and appeal processes",
      "Account security guidance",
    ],
    note: "Meta advertising account support is not included unless agreed separately in writing.",
    covers: { instagram: true, facebook: true, ads: false },
  },
  {
    id: "lifetime",
    name: "MetaShield Lifetime Plan",
    price: "₦500,000",
    priceKobo: 500_000_00,
    priceSuffix: "one-time",
    period: "lifetime",
    tagline: "Lifetime account recovery & ongoing support",
    description: "Pay once — no monthly or annual renewal fees.",
    features: [
      "One registered Instagram account",
      "One registered Facebook account",
      "One registered Meta advertising account",
      "Help with eligible advertising account access issues and restrictions",
      "Guidance through available recovery, review, and appeal processes",
      "Monthly account security check",
      "Priority support during published support hours",
      "No monthly or annual subscription renewal fees",
    ],
    note: "Advertising budgets and third-party charges are not included.",
    covers: { instagram: true, facebook: true, ads: true },
  },
];

export const PLAN_IDS: PlanId[] = plans.map((p) => p.id as PlanId);

const legacyPlans: Plan[] = [
  { id: "basic", name: "Basic (old plan)", price: "₦50,000", priceKobo: 50_000_00, priceSuffix: "/mo", period: "month", tagline: "", description: "", features: [], covers: { instagram: false, facebook: false, ads: false } },
  { id: "professional", name: "Professional (old plan)", price: "₦70,000", priceKobo: 70_000_00, priceSuffix: "/mo", period: "month", tagline: "", description: "", features: [], covers: { instagram: false, facebook: false, ads: false } },
  { id: "business", name: "Business (old plan)", price: "₦100,000", priceKobo: 100_000_00, priceSuffix: "/mo", period: "month", tagline: "", description: "", features: [], covers: { instagram: false, facebook: false, ads: false } },
  { id: "one_time", name: "Annual Protection (old plan)", price: "₦200,000", priceKobo: 200_000_00, priceSuffix: "/yr", period: "year", tagline: "", description: "", features: [], covers: { instagram: false, facebook: false, ads: false } },
];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as string[]).includes(value);
}

export function getPlan(id: AnyPlanId | string): Plan {
  return plans.find((p) => p.id === id) ?? legacyPlans.find((p) => p.id === id) ?? plans[0];
}

// When a package bought now runs out (null = never, for Lifetime).
export function planEndsOn(plan: Plan, from: Date = new Date()): string | null {
  if (plan.period === "lifetime") return null;
  const d = new Date(from);
  if (plan.period === "year") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

// Monthly value of a package, for revenue figures (Lifetime counts as 0
// recurring revenue — it's a one-off payment).
export function monthlyValueKobo(plan: Plan): number {
  if (plan.period === "year") return Math.round(plan.priceKobo / 12);
  if (plan.period === "lifetime") return 0;
  return plan.priceKobo;
}

// Which kind of account a case is about, for package coverage.
export function coverageKind(platform: string): "instagram" | "facebook" | "ads" | null {
  const p = platform.trim().toLowerCase();
  if (p === "instagram") return "instagram";
  if (p === "facebook" || p === "messenger") return "facebook";
  if (p === "meta business" || p === "meta ads" || p.includes("ad account")) return "ads";
  return null;
}

// Whether an active package covers a new recovery case on this platform.
export function packageCovers(plan: Plan, platform: string): boolean {
  const kind = coverageKind(platform);
  return kind ? plan.covers[kind] : false;
}

// Card checkout is switched on in Vercel once Korapay is set up.
export function cardPaymentsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_KORAPAY_ENABLED === "true";
}

// WhatsApp message asking for a package (used while card payment is off).
export function packageWhatsAppText(plan: Plan): string {
  return `Hello MetaShield, I'd like to get the ${plan.name} package (${plan.price}${
    plan.period === "lifetime" ? " one-time" : plan.priceSuffix ?? ""
  }).`;
}
