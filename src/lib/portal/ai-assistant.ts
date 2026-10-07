// Lightweight, rule-based assistant that reasons over the accounts already
// loaded in the portal. It is NOT a general-purpose LLM — it's templated
// logic that reads real score/status data so answers stay accurate.
// TODO before launch: swap this for a real model call (with the same
// account data as context) once a backend exists to hold an API key.

import type { PortalAccount } from "@/lib/portal/data";

const securityTips = [
  "Enable two-factor authentication if you haven't already",
  "Review which apps and devices are still connected",
  "Check who has admin access on business assets",
  "Look back over any recent policy warnings",
];

function levelWord(level: PortalAccount["level"]) {
  return level === "low" ? "healthy" : level === "medium" ? "worth reviewing" : "high risk";
}

function levelEmoji(level: PortalAccount["level"]) {
  return level === "low" ? "🟢" : level === "medium" ? "🟡" : "🔴";
}

export function generateInsight(account: PortalAccount): string {
  if (account.level === "high") {
    return `${levelEmoji(account.level)} I checked ${account.handle} (${account.platform}) — it's currently at ${account.health}/100, which is high risk. I'd review recent activity and tighten up security today rather than wait for a review cycle.`;
  }
  if (account.level === "medium") {
    return `${levelEmoji(account.level)} ${account.handle} (${account.platform}) is sitting at ${account.health}/100 — a few things are worth a look before they become real risk. Ask me for specifics any time.`;
  }
  return `${levelEmoji(account.level)} ${account.handle} (${account.platform}) looks healthy at ${account.health}/100. I'll keep watching and flag anything that changes.`;
}

export function pickPriorityAccount(accounts: PortalAccount[]): PortalAccount | null {
  if (accounts.length === 0) return null;
  const order = { high: 0, medium: 1, low: 2 } as const;
  return [...accounts].sort((a, b) => order[a.level] - order[b.level] || a.health - b.health)[0];
}

export function respondTo(message: string, accounts: PortalAccount[]): string {
  const q = message.toLowerCase();

  if (accounts.length === 0) {
    return "I don't have any accounts to check yet — run an Account Health Check first and I'll start monitoring it.";
  }

  if (/\b(hi|hello|hey)\b/.test(q)) {
    const priority = pickPriorityAccount(accounts);
    return priority
      ? `Hey! I'm keeping an eye on ${accounts.length} account${accounts.length > 1 ? "s" : ""}. ${generateInsight(priority)}`
      : "Hey! I'm here whenever you want a read on your account health.";
  }

  if (/(score|health|status|how.*(is|are).*(account|doing))/.test(q)) {
    return accounts
      .map((a) => `${levelEmoji(a.level)} ${a.handle} (${a.platform}): ${a.health}/100 — ${levelWord(a.level)}.`)
      .join("\n");
  }

  if (/(risk|worried|danger|flag)/.test(q)) {
    const priority = pickPriorityAccount(accounts);
    return priority ? generateInsight(priority) : "Nothing's flagged as risky right now.";
  }

  if (/(protect|secure|security|safe)/.test(q)) {
    return `Here's what I'd check first:\n${securityTips.map((t) => `• ${t}`).join("\n")}\n\nWant me to walk you to the Protection plans?`;
  }

  if (/(case|recover|appeal|disabled|restrict)/.test(q)) {
    return "For anything already restricted or disabled, the Recovery Eligibility Checker is the fastest way to open a case — I can't file appeals myself, but I'll keep you posted on any open case's status.";
  }

  if (/(ad|advertis|campaign)/.test(q)) {
    const adAccount = accounts.find((a) => /ads|business/i.test(a.platform));
    return adAccount
      ? `${adAccount.handle} is your main ad-related account — currently ${adAccount.health}/100. Regular or high-spend campaigns tend to draw more review, so keep policy compliance tight there.`
      : "I don't see a dedicated ad account yet — run a health check on one and I'll start tracking it.";
  }

  return "I can tell you about account health, risk flags, security steps, or point you to a recovery case. For anything more complex, message our team directly and they'll take it from here.";
}
