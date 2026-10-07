// Account Protection subscription plan catalog. Real subscription/invoice
// state now lives in Supabase (subscriptions/invoices tables) — see
// lib/portal/subscriptions.ts — not here.
//
// TODO before launch: "subscribing" currently records a paid subscription
// immediately without collecting real payment (see /api/subscribe) —
// Korapay is reserved for this flow once configured (case fees use bank
// transfer + receipt review instead, see lib/portal/bank-details.ts).

export type PlanId = "basic" | "professional" | "business" | "one_time";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  priceKobo: number;
  priceSuffix?: string;
  description: string;
  features: string[];
};

export const plans: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    price: "₦50,000",
    priceKobo: 50_000_00,
    priceSuffix: "/mo",
    description: "For individuals who want regular account protection.",
    features: [
      "Monthly account health check (1 Instagram + 1 Facebook)",
      "Policy-risk review",
      "Security checklist",
      "Account settings review",
      "Suspicious activity review",
      "Impersonation check",
      "Monthly security report",
      "Email support",
      "Emergency alert if a serious issue is detected",
      "🚨 Emergency Security Response",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: "₦70,000",
    priceKobo: 70_000_00,
    priceSuffix: "/mo",
    description: "For creators, influencers and businesses relying heavily on one account.",
    features: [
      "Weekly account monitoring (1 Instagram + 1 Facebook)",
      "Risk assessment",
      "Policy violation monitoring",
      "Suspicious-login review",
      "2FA/security setup assistance",
      "Recovery email/phone verification",
      "Impersonator monitoring",
      "Priority support",
      "Policy-risk alerts",
      "Monthly detailed security report",
      "Emergency response guidance",
      "🚨 Emergency Security Response",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "₦100,000",
    priceKobo: 100_000_00,
    priceSuffix: "/mo",
    description: "A full business security service for brands managing multiple accounts and teams.",
    features: [
      "Everything in Professional",
      "🚨 Emergency Security Response",
      "Up to 5 accounts",
      "Multiple admins",
      "Business Manager review",
      "Ad account monitoring",
      "Page/account permission audit",
      "Team access review",
      "Former employee/vendor access review",
      "Impersonation monitoring",
      "Scam/fake-page monitoring",
      "Security incident tracking",
      "Dedicated account manager",
      "Priority incident response",
      "Monthly executive security report",
      "Account security recommendations",
      "Quarterly security audit",
    ],
  },
  {
    id: "one_time",
    name: "Annual Protection",
    price: "₦200,000",
    priceKobo: 200_000_00,
    priceSuffix: "/yr",
    description: "A comprehensive annual security package — one payment, a full year of protection.",
    features: [
      "🚨 Emergency Security Response",
      "Full account security audit",
      "Security hardening",
      "2FA setup",
      "Recovery-channel audit",
      "Business Manager security audit",
      "Admin/permission cleanup",
      "Policy-risk assessment",
      "Impersonation monitoring",
      "Security configuration monitoring",
      "Account health monitoring",
      "Incident-response support",
      "Priority recovery support",
      "Monthly monitoring",
      "Monthly security reports",
      "Dedicated account manager",
    ],
  },
];

export function getPlan(id: PlanId): Plan {
  return plans.find((p) => p.id === id) ?? plans[1];
}
