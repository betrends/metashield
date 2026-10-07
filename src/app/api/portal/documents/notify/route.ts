// Fires after a client submits documents in the portal.
// Sends an HTML notification email to the team (NOTIFY_EMAIL) so
// the assigned agent knows there's new material to review.
// Auth-gated: only a signed-in user can trigger this for their own docs.

import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { documentsSubmittedEmail } from "@/lib/email-templates";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { fileNames?: unknown; caseTitle?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const fileNames: string[] = Array.isArray(body.fileNames)
    ? body.fileNames.filter((n): n is string => typeof n === "string")
    : [];
  const caseTitle = typeof body.caseTitle === "string" ? body.caseTitle : null;

  if (fileNames.length === 0) {
    return NextResponse.json({ error: "no_files" }, { status: 400 });
  }

  const clientEmail = user.email ?? "";
  const clientName =
    (user.user_metadata?.full_name as string | undefined) ||
    clientEmail.split("@")[0] ||
    "A client";

  const resendKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.NOTIFY_EMAIL;

  if (resendKey && notifyTo) {
    try {
      const resend = new Resend(resendKey);
      const fromAddress =
        process.env.RESEND_FROM_EMAIL || "MetaShield <onboarding@resend.dev>";

      const html = documentsSubmittedEmail({
        clientName,
        clientEmail,
        fileCount: fileNames.length,
        fileNames,
        caseTitle,
      });

      const { error: sendError } = await resend.emails.send({
        from: fromAddress,
        to: notifyTo,
        replyTo: clientEmail || undefined,
        subject: `📎 ${fileNames.length} document${fileNames.length !== 1 ? "s" : ""} submitted by ${clientName}`,
        html,
        text: [
          `Client: ${clientName} (${clientEmail})`,
          caseTitle ? `Case: ${caseTitle}` : "",
          `Files submitted (${fileNames.length}):`,
          ...fileNames.map((n) => `  - ${n}`),
          "",
          `Review in the admin dashboard: ${process.env.NEXT_PUBLIC_APP_URL || "https://account-recovery-platform.vercel.app"}/admin`,
        ]
          .filter(Boolean)
          .join("\n"),
      });

      if (sendError) {
        console.error("Resend rejected document notification:", sendError);
      }
    } catch (err) {
      // Don't fail the response — the docs are already saved in Supabase.
      console.error("Failed to send document notification:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
