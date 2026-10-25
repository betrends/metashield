// Internal alerts to the team inbox (NOTIFY_EMAIL). Server-only, awaited,
// never throws; failures are logged.

import { Resend } from "resend";
import { staffAlertEmail } from "@/lib/email-templates";

export async function sendStaffAlert(input: {
  subject: string;
  lines: string[];
  link?: string | null;
  to?: (string | null | undefined)[];
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = Array.from(
    new Set([process.env.NOTIFY_EMAIL, ...(input.to ?? [])].filter((e): e is string => !!e && e.includes("@")))
  );
  if (!apiKey || recipients.length === 0) return { sent: false };
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "MetaShield <onboarding@resend.dev>",
      to: recipients,
      subject: input.subject.replace(/[\r\n]+/g, " ").slice(0, 200),
      html: staffAlertEmail({ title: input.subject, lines: input.lines, link: input.link }),
      text: [...input.lines, input.link ? `\n${process.env.NEXT_PUBLIC_APP_URL || ""}${input.link}` : ""].join("\n"),
    });
    if (error) {
      console.error("Staff alert rejected by Resend:", error);
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error("Staff alert failed:", err);
    return { sent: false };
  }
}
