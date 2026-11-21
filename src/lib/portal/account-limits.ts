// How many accounts each package lets a client add, by kind. These match
// what each package covers (see billing.ts and the package cards):
//   Watch    1 Instagram + 1 Facebook
//   Elite    2 Instagram + 1 Facebook + 1 Meta ad account
//   Business 3 Instagram + 3 Facebook + 3 Meta ad accounts
//   Annual   2 Instagram + 2 Facebook
//   Lifetime 1 Instagram + 1 Facebook + 1 Meta ad account
// Without a package (or after it ends) nothing is saved: a health check
// still shows the score, but it isn't kept in the portal.
// The database enforces the same numbers (migration 021), so this file is
// for showing the right messages — keep the two in step.

export type AccountKind = "instagram" | "facebook" | "ads" | "other";
export type AccountLimits = Record<Exclude<AccountKind, "other">, number>;

const NONE: AccountLimits = { instagram: 0, facebook: 0, ads: 0 };

export const PLAN_ACCOUNT_LIMITS: Record<string, AccountLimits> = {
  watch: { instagram: 1, facebook: 1, ads: 0 },
  elite: { instagram: 2, facebook: 1, ads: 1 },
  biz: { instagram: 3, facebook: 3, ads: 3 },
  annual: { instagram: 2, facebook: 2, ads: 0 },
  lifetime: { instagram: 1, facebook: 1, ads: 1 },
  // Older plans no longer sold: one Instagram and one Facebook.
  basic: { instagram: 1, facebook: 1, ads: 0 },
  professional: { instagram: 1, facebook: 1, ads: 0 },
  business: { instagram: 1, facebook: 1, ads: 0 },
  one_time: { instagram: 1, facebook: 1, ads: 0 },
};

export const KIND_LABEL: Record<AccountKind, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  ads: "Meta ad",
  other: "other",
};

// Platform names as the health check saves them: "Instagram", "Facebook",
// "Meta Business" (ads/Business Manager), "TikTok", "Google Ads", "Other".
export function accountKind(platform: string): AccountKind {
  const p = platform.toLowerCase();
  if (p.includes("instagram")) return "instagram";
  if (p.includes("facebook")) return "facebook";
  if (p.includes("meta")) return "ads";
  return "other";
}

// A package counts while it's active or in its free month, and hasn't ended.
export type SubscriptionLike = { planId: string; status: string; renewsOn?: string | null } | null | undefined;

export function limitsFor(sub: SubscriptionLike, now: number = Date.now()): AccountLimits {
  if (!sub || (sub.status !== "active" && sub.status !== "trial")) return NONE;
  if (sub.renewsOn && new Date(sub.renewsOn).getTime() < now) return NONE;
  return PLAN_ACCOUNT_LIMITS[sub.planId] ?? NONE;
}

export function limitFor(kind: AccountKind, sub: SubscriptionLike): number {
  return kind === "other" ? 0 : limitsFor(sub)[kind];
}

type AccountLike = { id: string; platform: string; createdAt?: string };

// Which saved accounts the package covers: for each kind, the oldest ones
// up to the limit. Anything beyond is kept but shown as "Not covered".
export function coveredAccountIds(accounts: AccountLike[], sub: SubscriptionLike): Set<string> {
  const limits = limitsFor(sub);
  const used: Record<AccountKind, number> = { instagram: 0, facebook: 0, ads: 0, other: 0 };
  const covered = new Set<string>();
  const oldestFirst = [...accounts].sort(
    (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
  );
  for (const a of oldestFirst) {
    const kind = accountKind(a.platform);
    if (kind === "other") continue;
    if (used[kind] < limits[kind]) {
      used[kind] += 1;
      covered.add(a.id);
    }
  }
  return covered;
}

export type AddCheck =
  | { ok: true }
  | { ok: false; reason: "no_package" | "not_covered" | "limit"; message: string };

// Can this client save one more account of this platform?
export function canAddAccount(platform: string, accounts: AccountLike[], sub: SubscriptionLike, planName = "Your package"): AddCheck {
  const kind = accountKind(platform);
  const limits = limitsFor(sub);
  const anyLimit = limits.instagram + limits.facebook + limits.ads > 0;
  if (!anyLimit) {
    return {
      ok: false,
      reason: "no_package",
      message: "Start a package to keep this score in your portal and have the account monitored.",
    };
  }
  const limit = kind === "other" ? 0 : limits[kind];
  if (limit === 0) {
    return {
      ok: false,
      reason: "not_covered",
      message: `${planName} doesn't cover ${kind === "other" ? "this platform" : `${KIND_LABEL[kind]} accounts`}, so this score isn't saved. Upgrade your package to add it.`,
    };
  }
  const have = accounts.filter((a) => accountKind(a.platform) === kind).length;
  if (have >= limit) {
    return {
      ok: false,
      reason: "limit",
      message: `${planName} covers ${limit} ${KIND_LABEL[kind]} account${limit > 1 ? "s" : ""}, and you've already added ${have === limit ? (limit > 1 ? "them" : "it") : have}. This score isn't saved — upgrade your package to add more.`,
    };
  }
  return { ok: true };
}
