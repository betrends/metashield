// Sends case-update emails to the CLIENT (not the team — see
// /api/notify for that). Used for: a case being submitted with an agent
// assigned, and (once there's a way to change stages) future stage
// changes. Server-side only, so RESEND_API_KEY never reaches the browser.
//
// Falls back gracefully: if RESEND_API_KEY isn't set, this is a no-op —
// the case itself is already saved regardless of whether this email
// sends. Note: Resend's sandbox sender can only actually deliver to your
// own verified test address until a real domain is verified there — see
// .env.local.example.

import { Resend } from "resend";
import { NextResponse } from "next/server";
import {
  caseSubmittedEmail,
  receiptReceivedEmail,
  agentAssignedEmail,
  stageChangedEmail,
  paymentConfirmedEmail,
} from "@/lib/email-templates";

type Kind =
  | "case_submitted"
  | "receipt_received"
  | "stage_changed"
  | "agent_assigned"
  | "payment_confirmed";

const KIND_SUBJECT: Record<Kind, (caseTitle: string, extra?: string) => string> = {
  case_submitted: (title) => `🛡️ Your MetaShield case is in: ${title}`,
  receipt_received: (title) => `✅ Payment receipt received: ${title}`,
  stage_changed: (title, stage) => `📋 Case update — ${stage ?? "Status changed"}: ${title}`,
  agent_assigned: (title, agent) => `👋 Meet your agent${agent ? ` ${agent}` : ""}: ${title}`,
  payment_confirmed: (title) => `🚀 Payment confirmed — recovery starting: ${title}`,
};

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Not configured — nothing to send, but this isn't an error the
    // caller needs to react to.
    return NextResponse.json({ ok: true, sent: false });
  }

  let body: {
    to?: unknown;
    clientName?: unknown;
    caseTitle?: unknown;
    kind?: unknown;
    agentName?: unknown;
    agentPhone?: unknown;
    stage?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const clientName = typeof body.clientName === "string" ? body.clientName.trim() : "there";
  const caseTitle = typeof body.caseTitle === "string" ? body.caseTitle.trim() : "your case";
  const agentName = typeof body.agentName === "string" ? body.agentName.trim() : null;
  const agentPhone = typeof body.agentPhone === "string" ? body.agentPhone.trim() : null;
  const stage = typeof body.stage === "string" ? body.stage.trim() : "Updated";

  const kind: Kind =
    body.kind === "stage_changed"
      ? "stage_changed"
      : body.kind === "receipt_received"
        ? "receipt_received"
        : body.kind === "agent_assigned"
          ? "agent_assigned"
          : body.kind === "payment_confirmed"
            ? "payment_confirmed"
            : "case_submitted";

  if (!to) {
    return NextResponse.json({ error: "missing_recipient" }, { status: 400 });
  }

  // Build HTML + plain-text fallback
  let html: string;
  let textFallback: string;

  if (kind === "case_submitted") {
    html = caseSubmittedEmail({ clientName, caseTitle, agentName, agentPhone });
    textFallback = [
      `Hi ${clientName},`,
      "",
      `We've received your case: ${caseTitle}.`,
      agentName ? `${agentName} has been assigned as your agent.` : "",
      agentPhone ? `You can reach them at ${agentPhone}.` : "",
      "",
      "Recovery work starts as soon as the case fee is paid.",
      "Track progress in your portal.",
    ]
      .filter(Boolean)
      .join("\n");
  } else if (kind === "receipt_received") {
    html = receiptReceivedEmail({ clientName, caseTitle });
    textFallback = [
      `Hi ${clientName},`,
      "",
      `We've received your payment receipt for ${caseTitle}.`,
      "You'll get an email as soon as it's verified and recovery work begins.",
    ].join("\n");
  } else if (kind === "agent_assigned") {
    html = agentAssignedEmail({
      clientName,
      caseTitle,
      agentName: agentName ?? "Your agent",
      agentPhone,
    });
    textFallback = [
      `Hi ${clientName},`,
      "",
      `${agentName ?? "A new agent"} is now handling your case: ${caseTitle}.`,
      agentPhone ? `Contact them at ${agentPhone}.` : "",
      "Message them anytime from your portal.",
    ]
      .filter(Boolean)
      .join("\n");
  } else if (kind === "payment_confirmed") {
    html = paymentConfirmedEmail({ clientName, caseTitle, agentName });
    textFallback = [
      `Hi ${clientName},`,
      "",
      `Great news! Your payment for ${caseTitle} has been confirmed.`,
      agentName ? `${agentName} is now actively working on your recovery.` : "Recovery work is now underway.",
      "Track your case live in your portal.",
    ].join("\n");
  } else {
    // stage_changed
    html = stageChangedEmail({ clientName, caseTitle, stage, agentName });
    textFallback = [
      `Hi ${clientName},`,
      "",
      `Your case (${caseTitle}) has moved to: ${stage}.`,
      "Log in to your portal for the full details.",
    ].join("\n");
  }

  try {
    const resend = new Resend(apiKey);
    const fromAddress = process.env.RESEND_FROM_EMAIL || "MetaShield <onboarding@resend.dev>";
    const { error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject: KIND_SUBJECT[kind](caseTitle, kind === "stage_changed" ? stage : agentName ?? undefined),
      html,
      text: textFallback,
    });
    if (error) {
      console.error("Resend rejected the case-update email:", error);
      return NextResponse.json({ ok: true, sent: false });
    }
  } catch (err) {
    console.error("Failed to send case-update email:", err);
    return NextResponse.json({ ok: true, sent: false });
  }

  return NextResponse.json({ ok: true, sent: true });
}
