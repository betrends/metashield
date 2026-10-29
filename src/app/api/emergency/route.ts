// Emergency Security Response — creates an urgent case immediately and
// fires a high-priority email to the team. Only available to Professional
// and Business subscribers.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

// Any package (current or an older plan) includes emergency support.
const ELIGIBLE_PLANS = ["watch", "elite", "annual", "lifetime", "basic", "professional", "business", "one_time"];

const INCIDENT_LABELS: Record<string, string> = {
  hacked: "Account hacked",
  restricted: "Account restricted",
  suspicious_login: "Suspicious login detected",
  unauthorized_admin: "Unauthorized admin added",
  impersonation: "Impersonation account found",
  phishing: "Phishing/scam attempt",
  other: "Other security incident",
};

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Verify they have an eligible subscription
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("plan_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!sub || !ELIGIBLE_PLANS.includes(sub.plan_id)) {
    return NextResponse.json({ error: "not_eligible" }, { status: 403 });
  }

  let body: { incidentType?: unknown; details?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const incidentType = typeof body.incidentType === "string" ? body.incidentType : "";
  const details = typeof body.details === "string" ? body.details.trim() : "";

  if (!incidentType || !INCIDENT_LABELS[incidentType]) {
    return NextResponse.json({ error: "invalid_incident_type" }, { status: 400 });
  }

  const clientName =
    (user.user_metadata?.full_name as string | undefined) || user.email?.split("@")[0] || "Client";
  const incidentLabel = INCIDENT_LABELS[incidentType];

  // Create an urgent case in the cases table
  const { data: agentRow } = await admin
    .from("agents")
    .select("id, name, phone, email")
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  const agentName = agentRow?.name ?? "MetaShield Team";
  const agentPhone = agentRow?.phone ?? "";
  const agentEmail = agentRow?.email ?? "";

  const { data: newCase, error: caseError } = await admin
    .from("cases")
    .insert({
      user_id: user.id,
      title: `🚨 EMERGENCY: ${incidentLabel}`,
      platform: "Emergency",
      account_handle: user.email ?? "unknown",
      stage: "Recovery Process",
      agent_id: agentRow?.id ?? null,
      agent_name: agentName,
      agent_phone: agentPhone,
      agent_email: agentEmail,
      issue: details || incidentLabel,
      fee_amount_kobo: 0,
      payment_status: "paid",
    })
    .select("id")
    .single();

  if (caseError || !newCase) {
    console.error("Emergency case creation failed:", caseError);
    return NextResponse.json({ error: "case_creation_failed" }, { status: 500 });
  }

  // Add timeline event
  await admin.from("case_timeline_events").insert([
    { case_id: newCase.id, event: "🚨 Emergency incident reported" },
    { case_id: newCase.id, event: `Incident type: ${incidentLabel}` },
    { case_id: newCase.id, event: `Assigned to ${agentName} — response in progress` },
  ]);

  // Welcome message from agent
  await admin.from("messages").insert({
    user_id: user.id,
    case_id: newCase.id,
    from_role: "team",
    author_name: agentName,
    body: `Hi ${clientName.split(" ")[0]}, this is ${agentName}. I've received your emergency report: ${incidentLabel}. I'm on it right now — please do not make any changes to your account until you hear from me. I'll be in touch within the hour. You can also reach me at ${agentPhone}.`,
  });

  // Fire urgent email to the team
  const resendKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.NOTIFY_EMAIL;
  const fromAddress = process.env.RESEND_FROM_EMAIL || "MetaShield <onboarding@resend.dev>";

  if (resendKey && notifyTo) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: fromAddress,
        to: notifyTo,
        replyTo: user.email ?? undefined,
        subject: `🚨 EMERGENCY INCIDENT — ${incidentLabel} — ${clientName}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fff1f2;border-radius:12px;border:2px solid #ef4444;">
            <h1 style="color:#dc2626;margin:0 0 8px;">🚨 Emergency Security Incident</h1>
            <p style="color:#7f1d1d;font-size:14px;margin:0 0 24px;">A client has reported an emergency. Respond immediately.</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#374151;font-weight:600;width:140px;">Client</td><td style="padding:8px 0;color:#111827;">${clientName}</td></tr>
              <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Email</td><td style="padding:8px 0;color:#111827;">${user.email}</td></tr>
              <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Incident</td><td style="padding:8px 0;color:#dc2626;font-weight:700;">${incidentLabel}</td></tr>
              <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Plan</td><td style="padding:8px 0;color:#111827;">${sub.plan_id}</td></tr>
              ${details ? `<tr><td style="padding:8px 0;color:#374151;font-weight:600;vertical-align:top;">Details</td><td style="padding:8px 0;color:#111827;">${details}</td></tr>` : ""}
              <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Case ID</td><td style="padding:8px 0;color:#6d28d9;">${newCase.id}</td></tr>
            </table>
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/admin/reports" style="display:inline-block;margin-top:24px;background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">View in Admin Reports →</a>
          </div>
        `,
      });
    } catch (e) {
      console.error("Failed to send emergency team email:", e);
    }
  }

  return NextResponse.json({ ok: true, caseId: newCase.id });
}
