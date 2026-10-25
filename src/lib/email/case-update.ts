// Case-update emails to the CLIENT (team notifications live in
// /api/notify). Server-only: called directly by server routes, and by
// /api/case-update-email for the few emails the browser triggers (always
// to the signed-in user's own address).
//
// No-ops when RESEND_API_KEY isn't set. Never throws — a failed email must
// not undo the case change that triggered it.

import { Resend } from "resend";
import {
  caseSubmittedEmail,
  receiptReceivedEmail,
  agentAssignedEmail,
  stageChangedEmail,
  paymentConfirmedEmail,
  balanceDueEmail,
} from "@/lib/email-templates";

export type CaseEmailKind =
  | "case_submitted"
  | "receipt_received"
  | "stage_changed"
  | "agent_assigned"
  | "payment_confirmed"
  | "balance_due"
  | "balance_overdue";

export const CASE_EMAIL_KINDS: CaseEmailKind[] = [
  "case_submitted",
  "receipt_received",
  "stage_changed",
  "agent_assigned",
  "payment_confirmed",
];

const KIND_SUBJECT: Record<CaseEmailKind, (caseTitle: string, extra?: string) => string> = {
  case_submitted: (title) => `🛡️ Your MetaShield case is in: ${title}`,
  receipt_received: (title) => `✅ Payment receipt received: ${title}`,
  stage_changed: (title, stage) => `📋 Case update — ${stage ?? "Status changed"}: ${title}`,
  agent_assigned: (title, agent) => `👋 Meet your agent${agent ? ` ${agent}` : ""}: ${title}`,
  payment_confirmed: (title) => `🚀 Payment confirmed — recovery starting: ${title}`,
  balance_due: (title) => `🎉 Recovery complete — final balance due: ${title}`,
  balance_overdue: (title) => `⏰ Final balance overdue: ${title}`,
};

export type CaseEmailInput = {
  to: string;
  kind: CaseEmailKind;
  clientName?: string | null;
  caseTitle?: string | null;
  agentName?: string | null;
  agentPhone?: string | null;
  stage?: string | null;
  balance?: string | null;
  deadline?: string | null;
};

// Subject lines are plain text, but strip line breaks so nothing can be
// smuggled into extra headers.
function oneLine(s: string) {
  return s.replace(/[\r\n]+/g, " ").slice(0, 200);
}

export async function sendCaseUpdateEmail(input: CaseEmailInput): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = input.to.trim();
  if (!apiKey || !to) return { sent: false };

  const clientName = input.clientName?.trim() || "there";
  const caseTitle = input.caseTitle?.trim() || "your case";
  const agentName = input.agentName?.trim() || null;
  const agentPhone = input.agentPhone?.trim() || null;
  const stage = input.stage?.trim() || "Updated";
  const kind = input.kind;

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
    html = agentAssignedEmail({ clientName, caseTitle, agentName: agentName ?? "Your agent", agentPhone });
    textFallback = [
      `Hi ${clientName},`,
      "",
      `${agentName ?? "A new agent"} is now handling your case: ${caseTitle}.`,
      agentPhone ? `Contact them at ${agentPhone}.` : "",
      "Message them anytime from your portal.",
    ]
      .filter(Boolean)
      .join("\n");
  } else if (kind === "balance_due" || kind === "balance_overdue") {
    const balance = input.balance ?? "";
    const deadline = input.deadline ?? "";
    html = balanceDueEmail({ clientName, caseTitle, balance, deadline, overdue: kind === "balance_overdue" });
    textFallback = [
      `Hi ${clientName},`,
      "",
      kind === "balance_overdue"
        ? `The remaining balance of ${balance} for ${caseTitle} was due by ${deadline} and is now overdue.`
        : `Your recovery for ${caseTitle} is complete. The remaining balance of ${balance} is due by ${deadline}.`,
      "Pay by bank transfer and upload your receipt from your case page.",
    ].join("\n");
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
      subject: oneLine(KIND_SUBJECT[kind](caseTitle, kind === "stage_changed" ? stage : agentName ?? undefined)),
      html,
      text: textFallback,
    });
    if (error) {
      console.error("Resend rejected the case-update email:", error);
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error("Failed to send case-update email:", err);
    return { sent: false };
  }
}
