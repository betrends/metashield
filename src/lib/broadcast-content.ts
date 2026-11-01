// What the admin can change in a bulk email (Admin → Email users), with
// the original packages announcement as the starting point. Used by the
// page (form + defaults) and the server (checks every field before it goes
// into an email).

export type BroadcastLink = "packages" | "health_check" | "eligibility" | "sign_up" | "custom";

export type BroadcastContent = {
  label: string; // small coloured tag above the headline (optional)
  headline: string; // {name} becomes the person's first name
  intro: string; // text in the dark box under the headline
  message: string; // extra paragraphs under the box (optional)
  showComparison: boolean; // "Without a package / With a package ₦0" boxes
  showIncluded: boolean; // "Every package includes" list
  showPackages: boolean; // the four packages and prices
  buttonText: string;
  buttonLink: BroadcastLink;
  customLink: string; // used when buttonLink is "custom"
  ps: string; // P.S. line (optional)
};

export const BROADCAST_LIMITS = {
  label: 40,
  headline: 140,
  intro: 600,
  message: 3000,
  buttonText: 40,
  customLink: 300,
  ps: 300,
} as const;

export const DEFAULT_BROADCAST_CONTENT: BroadcastContent = {
  label: "🛡️ New from MetaShield",
  headline: "{name}, account recovery now comes at no extra cost.",
  intro:
    "Get one MetaShield package and if your Instagram or Facebook is ever **hacked, disabled or restricted**, our team handles the recovery — with no recovery fee on top.",
  message: "",
  showComparison: true,
  showIncluded: true,
  showPackages: true,
  buttonText: "See the packages →",
  buttonLink: "packages",
  customLink: "",
  ps: "Accounts get hacked and disabled without warning. Protection only works if it's in place before something goes wrong.",
};

export const BROADCAST_LINKS: { value: BroadcastLink; label: string; path: string }[] = [
  { value: "packages", label: "Packages page", path: "/pricing#packages" },
  { value: "health_check", label: "Free account health check", path: "/check-my-account" },
  { value: "eligibility", label: "Recovery eligibility check", path: "/recovery-eligibility" },
  { value: "sign_up", label: "Sign up page", path: "/portal/login?mode=sign-up" },
  { value: "custom", label: "Another link…", path: "" },
];

function text(v: unknown, max: number, fallback: string): string {
  if (typeof v !== "string") return fallback;
  return v.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, max);
}

// Only full https links (or http) are allowed for "Another link".
export function cleanLink(v: unknown): string {
  const s = typeof v === "string" ? v.trim().slice(0, BROADCAST_LIMITS.customLink) : "";
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

// Turns whatever the browser sent into safe, complete content. Missing
// fields fall back to the original email.
export function parseBroadcastContent(input: unknown): BroadcastContent {
  const d = DEFAULT_BROADCAST_CONTENT;
  if (!input || typeof input !== "object") return { ...d };
  const o = input as Record<string, unknown>;
  const link = BROADCAST_LINKS.some((l) => l.value === o.buttonLink) ? (o.buttonLink as BroadcastLink) : d.buttonLink;
  const customLink = cleanLink(o.customLink);
  const headline = text(o.headline, BROADCAST_LIMITS.headline, d.headline).trim();
  return {
    label: text(o.label, BROADCAST_LIMITS.label, d.label).trim(),
    headline: headline || d.headline,
    intro: text(o.intro, BROADCAST_LIMITS.intro, d.intro).trim(),
    message: text(o.message, BROADCAST_LIMITS.message, d.message).trim(),
    showComparison: typeof o.showComparison === "boolean" ? o.showComparison : d.showComparison,
    showIncluded: typeof o.showIncluded === "boolean" ? o.showIncluded : d.showIncluded,
    showPackages: typeof o.showPackages === "boolean" ? o.showPackages : d.showPackages,
    buttonText: text(o.buttonText, BROADCAST_LIMITS.buttonText, d.buttonText).trim(),
    // A custom link that isn't a proper web address falls back to the packages page.
    buttonLink: link === "custom" && !customLink ? "packages" : link,
    customLink,
    ps: text(o.ps, BROADCAST_LIMITS.ps, d.ps).trim(),
  };
}

export function broadcastButtonHref(c: BroadcastContent, siteUrl: string): string {
  if (c.buttonLink === "custom" && c.customLink) return c.customLink;
  const path = BROADCAST_LINKS.find((l) => l.value === c.buttonLink)?.path || "/pricing#packages";
  return `${siteUrl.replace(/\/$/, "")}${path}`;
}

// {name} → first name, or "Hi there" when we don't know it (and the
// headline starts with it).
export function fillName(s: string, name: string): string {
  const first = name.trim().split(/\s+/)[0] || "";
  if (first) return s.replace(/\{name\}/gi, first);
  return s.replace(/^\{name\}/i, "Hi there").replace(/\{name\}/gi, "there");
}
