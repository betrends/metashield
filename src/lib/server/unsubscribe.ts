// Signed unsubscribe links for marketing/follow-up emails. The token is an
// HMAC of the lower-cased email, so links can't be forged for someone
// else's address.

import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function unsubscribeToken(email: string): string {
  return createHmac("sha256", secret()).update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!secret() || !email || !token) return false;
  const expected = Buffer.from(unsubscribeToken(email));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function unsubscribeUrl(email: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://account-recovery-platform.vercel.app";
  return `${base}/api/unsubscribe?e=${encodeURIComponent(email.trim().toLowerCase())}&t=${unsubscribeToken(email)}`;
}
