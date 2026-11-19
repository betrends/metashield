// The compulsory "keep your account protected" checklist email
// (email-templates: protectionChecklistEmail). Sent when a package starts —
// after a confirmed card payment (api/subscribe/verify) or when the admin
// switches a package on (api/admin/subscriptions/activate). Not sent when a
// package that is still active is renewed or changed: the client already
// has it.

import { isPlanId } from "@/lib/portal/billing";
import { PROTECTION_CHECKLIST_SUBJECT, protectionChecklistEmail, protectionChecklistText } from "@/lib/email-templates";

const DAY = 24 * 60 * 60 * 1000;

type ExistingSubscription = { plan_id: string; status: string; renews_on: string | null } | null | undefined;

// True when the client had no current package before this activation
// (none at all, switched off, an old plan, or ended more than a day ago).
export function startsNewProtection(existing: ExistingSubscription, now: Date = new Date()): boolean {
  if (!existing || existing.status !== "active" || !isPlanId(existing.plan_id)) return true;
  if (!existing.renews_on) return false; // Lifetime, still active
  return new Date(existing.renews_on).getTime() < now.getTime() - DAY;
}

export async function sendProtectionChecklist(opts: { to: string; clientName: string; planName: string }): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || !opts.to) return false;
  try {
    const { Resend } = await import("resend");
    const { error } = await new Resend(resendKey).emails.send({
      from: process.env.RESEND_FROM_EMAIL || "MetaShield <onboarding@resend.dev>",
      to: opts.to,
      subject: PROTECTION_CHECKLIST_SUBJECT,
      html: protectionChecklistEmail({ clientName: opts.clientName, planName: opts.planName }),
      text: protectionChecklistText({ clientName: opts.clientName, planName: opts.planName }),
    });
    if (error) throw new Error(typeof error === "object" ? JSON.stringify(error) : String(error));
    return true;
  } catch (err) {
    console.error("[protection-checklist] send failed:", err);
    return false;
  }
}
