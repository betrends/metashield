// Fires after a client submits documents in the portal.
// Sends an HTML notification email to the team (NOTIFY_EMAIL) and to the
// case's assigned agent so they know there's new material to review, and
// moves a paid case waiting on documents on to "Under Review" — before
// this, nothing ever moved a case out of "Documents Required".
// Auth-gated: only a signed-in user can trigger this, and only for a case
// they own (checked through their own RLS-scoped session).

import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { documentsSubmittedEmail } from "@/lib/email-templates";
import { stageAfterDocumentsSubmitted, type PaymentStatus } from "@/lib/portal/case-rules";
import type { CaseStage } from "@/lib/portal/mock-data";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { fileNames?: unknown; caseTitle?: unknown; caseId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const fileNames: string[] = Array.isArray(body.fileNames)
    ? body.fileNames.filter((n): n is string => typeof n === "string")
    : [];
  let caseTitle = typeof body.caseTitle === "string" ? body.caseTitle : null;
  const caseId = typeof body.caseId === "string" && body.caseId ? body.caseId : null;

  if (fileNames.length === 0) {
    return NextResponse.json({ error: "no_files" }, { status: 400 });
  }

  const clientEmail = user.email ?? "";
  const clientName =
    (user.user_metadata?.full_name as string | undefined) ||
    clientEmail.split("@")[0] ||
    "A client";

  // Read through the client's own session: RLS only returns the case if
  // it belongs to them.
  let agentEmail: string | null = null;
  let newStage: CaseStage | null = null;
  if (caseId) {
    const { data: ownCase } = await supabase
      .from("cases")
      .select("id, title, stage, payment_status, agent_name, agent_email")
      .eq("id", caseId)
      .maybeSingle();
    if (ownCase) {
      caseTitle = caseTitle ?? ownCase.title;
      agentEmail = ownCase.agent_email ?? null;
      const admin = createAdminClient();
      const fileList = `${fileNames.length} document${fileNames.length !== 1 ? "s" : ""}`;
      const nextStage = stageAfterDocumentsSubmitted({
        stage: ownCase.stage as CaseStage,
        payment_status: ownCase.payment_status as PaymentStatus,
      });
      if (nextStage) {
        // Conditional on the stage still being "Documents Required" so a
        // concurrent staff change isn't overwritten.
        const { data: moved, error: moveError } = await admin
          .from("cases")
          .update({ stage: nextStage })
          .eq("id", caseId)
          .eq("stage", "Documents Required")
          .select("id")
          .maybeSingle();
        if (moveError) console.error("Failed to move case after documents:", moveError);
        if (moved) newStage = nextStage;
      }
      await admin.from("case_timeline_events").insert(
        [
          { case_id: caseId, event: `${fileList} submitted by client` },
          newStage ? { case_id: caseId, event: `Moved to ${newStage}` } : null,
        ].filter((e): e is { case_id: string; event: string } => e !== null)
      );
      if (newStage) {
        await admin.from("messages").insert({
          user_id: user.id,
          case_id: caseId,
          from_role: "team",
          author_name: ownCase.agent_name || "Your agent",
          body: `Thanks — I've received your ${fileList} and your case is now under review. I'll message you here if I need anything else.`,
        });
      }
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.NOTIFY_EMAIL;
  const recipients = Array.from(new Set([notifyTo, agentEmail].filter((e): e is string => !!e)));

  if (resendKey && recipients.length > 0) {
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
        to: recipients,
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

  return NextResponse.json({ ok: true, caseId, stage: newStage });
}
