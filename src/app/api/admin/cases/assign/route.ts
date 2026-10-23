// Assigns (or reassigns) a case to a specific agent — the "assign work
// from my end" flow. Logs a timeline event, a message from the new
// agent, and emails the client, same discipline as every other
// case-changing admin action. Gated to ADMIN_EMAIL.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";
import { sendCaseUpdateEmail } from "@/lib/email/case-update";
import { escapeHtml } from "@/lib/email-templates";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminUser || !adminEmail || adminUser.email !== adminEmail) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  let body: { caseId?: unknown; agentId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const agentId = typeof body.agentId === "string" ? body.agentId : "";
  if (!caseId || !agentId) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: agent, error: agentError } = await admin
    .from("agents")
    .select("id, name, phone, email")
    .eq("id", agentId)
    .single();
  if (agentError || !agent) {
    return NextResponse.json({ error: "agent_not_found" }, { status: 404 });
  }

  const { data: existingCase } = await admin
    .from("cases")
    .select("agent_id, agent_name")
    .eq("id", caseId)
    .maybeSingle();
  const isReassignment = !!existingCase?.agent_id && existingCase.agent_id !== agentId;

  const { data: updatedCase, error } = await admin
    .from("cases")
    .update({ agent_id: agent.id, agent_name: agent.name, agent_phone: agent.phone, agent_email: agent.email })
    .eq("id", caseId)
    .select("id, title, user_id")
    .single();

  if (error || !updatedCase) {
    console.error("Failed to assign case:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  await admin.from("case_timeline_events").insert({
    case_id: caseId,
    event: isReassignment ? `Reassigned to ${agent.name}` : `Assigned to ${agent.name}`,
  });

  await admin.from("messages").insert({
    user_id: updatedCase.user_id,
    case_id: caseId,
    from_role: "team",
    author_name: agent.name,
    body: isReassignment
      ? `Hi, I'm ${agent.name} and I'll be taking over your case (${updatedCase.title}) from here. Reach me directly at ${agent.phone}.`
      : `Hi, I'm ${agent.name} and I'll be handling your case (${updatedCase.title}). Reach me directly at ${agent.phone}.`,
  });

  const { data: clientData } = await admin.auth.admin.getUserById(updatedCase.user_id);
  const clientEmail = clientData?.user?.email;
  const clientName = (clientData?.user?.user_metadata?.full_name as string | undefined) || "there";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  if (clientEmail) {
    await sendCaseUpdateEmail({
      to: clientEmail,
      kind: "agent_assigned",
      clientName: clientName,
      caseTitle: updatedCase.title,
      agentName: agent.name,
      agentPhone: agent.phone,
    });
  }

  // Notify the agent by email so they know a case has been assigned to them
  if (agent.email) {
    const { data: caseRow } = await admin
      .from("cases")
      .select("platform, account_handle, issue")
      .eq("id", caseId)
      .single();
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const fromAddress = process.env.RESEND_FROM_EMAIL || "MetaShield <onboarding@resend.dev>";
      const label = isReassignment ? "You've been reassigned a case" : "You've been assigned a new case";
      // Case title, client name and issue come from the client — escape
      // them before putting them into HTML.
      const e = (v: string | null | undefined) => escapeHtml(v ?? "");
      const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#1a1a2e">
  <div style="background:#4f46e5;border-radius:12px;padding:20px 24px;margin-bottom:24px">
    <p style="color:#fff;font-size:13px;font-weight:600;margin:0;letter-spacing:1px;text-transform:uppercase">MetaShield</p>
    <h1 style="color:#fff;font-size:20px;font-weight:700;margin:8px 0 0">${label}</h1>
  </div>
  <p style="font-size:15px;margin-bottom:20px">Hi ${e(agent.name)}, a case has been assigned to you on MetaShield. Here are the details:</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e8e8f0;border-radius:8px;overflow:hidden">
    <tr style="background:#f5f5ff"><td style="padding:10px 16px;font-weight:600;color:#6b7280;width:35%">Case</td><td style="padding:10px 16px">${e(updatedCase.title)}</td></tr>
    <tr><td style="padding:10px 16px;font-weight:600;color:#6b7280;border-top:1px solid #e8e8f0">Client</td><td style="padding:10px 16px;border-top:1px solid #e8e8f0">${e(clientName)}${clientEmail ? ` &lt;${e(clientEmail)}&gt;` : ""}</td></tr>
    ${caseRow ? `<tr style="background:#f5f5ff"><td style="padding:10px 16px;font-weight:600;color:#6b7280;border-top:1px solid #e8e8f0">Platform</td><td style="padding:10px 16px;border-top:1px solid #e8e8f0">${e(caseRow.platform)} · ${e(caseRow.account_handle)}</td></tr>` : ""}
    ${caseRow?.issue ? `<tr><td style="padding:10px 16px;font-weight:600;color:#6b7280;border-top:1px solid #e8e8f0">Issue</td><td style="padding:10px 16px;border-top:1px solid #e8e8f0">${e(caseRow.issue)}</td></tr>` : ""}
  </table>
  <div style="margin-top:28px;text-align:center">
    <a href="${appUrl}/admin/cases" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">View case in admin</a>
  </div>
  <p style="margin-top:28px;font-size:13px;color:#6b7280">Log in with your email at <a href="${appUrl}/portal/login" style="color:#4f46e5">${appUrl}/portal/login</a> then go to Recovery Requests.</p>
</body>
</html>`;
      await resend.emails.send({
        from: fromAddress,
        to: agent.email,
        subject: `${label}: ${updatedCase.title.replace(/[\r\n]+/g, " ")}`,
        html,
      }).then((r) => {
        if (r.error) console.error("Agent email failed:", JSON.stringify(r.error));
        else console.log("Agent email sent:", r.data?.id, "to", agent.email);
      }).catch((e) => console.error("Agent email exception:", e));
    }
  }

  return NextResponse.json({ ok: true });
}
