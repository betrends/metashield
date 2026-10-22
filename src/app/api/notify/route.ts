// Handles every "someone told us something" moment on the site: the
// contact form, and the Health Check / Recovery Eligibility wizards.
// Stores the submission (so it's never lost even if email delivery has a
// hiccup) and emails the team via Resend.
//
// Falls back gracefully: if RESEND_API_KEY isn't set, the submission is
// still saved to the database — only the email notification is skipped.

import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { contactNotificationEmail, contactAutoReplyEmail } from "@/lib/email-templates";

type Source = "contact_form" | "health_check" | "recovery_eligibility" | "payment_receipt";
const VALID_SOURCES: Source[] = [
  "contact_form",
  "health_check",
  "recovery_eligibility",
  "payment_receipt",
];

const SOURCE_LABEL: Record<Source, string> = {
  contact_form: "Contact form",
  health_check: "Account Health Check",
  recovery_eligibility: "Recovery Eligibility Checker",
  payment_receipt: "Payment receipt",
};

export async function POST(request: Request) {
  let body: {
    source?: unknown;
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    message?: unknown;
    metadata?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const source = typeof body.source === "string" ? body.source : "";
  // This endpoint is public (contact form, wizards), so cap every field.
  // Template output is HTML-escaped in lib/email-templates.ts.
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 254) : "";

  if (!VALID_SOURCES.includes(source as Source)) {
    return NextResponse.json({ error: "invalid_source" }, { status: 400 });
  }
  if (!name || !email) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : null;
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 5000) : null;
  const metadata =
    body.metadata && typeof body.metadata === "object" && JSON.stringify(body.metadata).length <= 5000
      ? body.metadata
      : null;

  // Save first — this is the record of truth even if email sending fails.
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("contact_submissions").insert({
      source,
      name,
      email,
      phone,
      message,
      metadata,
    });
    if (error) throw error;
  } catch (err) {
    console.error("Failed to store contact submission:", err);
    return NextResponse.json({ error: "storage_failed" }, { status: 500 });
  }

  // Email notification — best-effort, not configured yet is fine.
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const fromAddress = process.env.RESEND_FROM_EMAIL || "MetaShield <onboarding@resend.dev>";
      const platform = metadata && typeof metadata === "object" && "platform" in metadata
        ? String((metadata as Record<string, unknown>).platform)
        : null;

      // 1. Team notification email
      const notifyTo = process.env.NOTIFY_EMAIL;
      if (notifyTo) {
        const screenshotUrl = metadata && typeof metadata === "object" && "screenshotUrl" in metadata
          ? String((metadata as Record<string, unknown>).screenshotUrl)
          : null;
        const htmlBody = contactNotificationEmail({
          source,
          name,
          email,
          phone,
          message,
          platform,
          screenshotUrl,
        });
        const metadataLines = metadata
          ? Object.entries(metadata as Record<string, unknown>)
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join("\n")
          : "";
        const { error: notifyErr } = await resend.emails.send({
          from: fromAddress,
          to: notifyTo,
          replyTo: email,
          subject: `📩 New ${SOURCE_LABEL[source as Source]} submission — ${name}`,
          html: htmlBody,
          text: [
            `Source: ${SOURCE_LABEL[source as Source]}`,
            `Name: ${name}`,
            `Email: ${email}`,
            phone ? `Phone: ${phone}` : null,
            message ? `\nMessage:\n${message}` : null,
            metadataLines ? `\nDetails:\n${metadataLines}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        });
        if (notifyErr) console.error("Resend rejected team notification:", notifyErr);
      }

      // 2. Auto-reply to the person who submitted
      const autoReplyHtml = contactAutoReplyEmail({ name });
      const { error: autoReplyErr } = await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: `✅ We've received your message — MetaShield`,
        html: autoReplyHtml,
        text: `Hi ${name},\n\nThanks for reaching out to MetaShield! We've received your message and will get back to you within 24 hours.\n\nIn the meantime, you can check your account health for free at ${process.env.NEXT_PUBLIC_APP_URL || "https://account-recovery-platform.vercel.app"}/check-my-account\n\nWe will never ask for your social media password.\n\n— The MetaShield Team`,
      });
      if (autoReplyErr) console.error("Resend rejected auto-reply:", autoReplyErr);

    } catch (err) {
      // Don't fail the request over email — the submission is already saved.
      console.error("Failed to send notification email:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
