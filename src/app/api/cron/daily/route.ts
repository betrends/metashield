// Daily job (Vercel Cron, see vercel.json). Safe to run more than once:
//  1. Overdue final balances — post one reminder in the case chat and
//     email the client and the team, once per case (de-duplicated).
//  2. Eligibility follow-ups — one email to people who checked recovery
//     eligibility, opted in, and haven't opened a case after 24 hours.
//     Skips unsubscribed addresses, people who already have a case, and
//     addresses emailed in the last 30 days. Every outcome is logged on
//     the submission (followup_status / followup_sent_at / followup_error).

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/server";
import { sendCaseUpdateEmail } from "@/lib/email/case-update";
import { sendStaffAlert } from "@/lib/email/staff-alert";
import { eligibilityFollowupEmail } from "@/lib/email-templates";
import { formatNaira } from "@/lib/portal/case-fees";
import { PAYMENT_COLUMNS, pickPaymentRecord, summarizePayment } from "@/lib/portal/payments";
import { postCaseMessage } from "@/lib/server/case-events";
import { unsubscribeUrl } from "@/lib/server/unsubscribe";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}` || !process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const result = { overdueReminders: 0, followups: { sent: 0, skipped: 0, failed: 0 } };

  // ── 1. Overdue balances ────────────────────────────────────────────
  const nowIso = new Date().toISOString();
  const { data: overdue, error: overdueError } = await admin
    .from("cases")
    .select(`id, user_id, title, agent_name, agent_email, ${PAYMENT_COLUMNS}`)
    .in("balance_status", ["due", "failed"])
    .lt("balance_due_at", nowIso)
    .is("cancelled_at", null)
    .limit(100);
  if (overdueError) console.error("[cron] overdue query failed:", overdueError);
  for (const c of overdue ?? []) {
    const p = summarizePayment(pickPaymentRecord(c));
    const balance = formatNaira(p.balanceKobo);
    const deadline = p.balanceDueAt
      ? new Date(p.balanceDueAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) + " (WAT)"
      : "the deadline";
    const created = await postCaseMessage(admin, {
      userId: c.user_id,
      caseId: c.id,
      authorName: c.agent_name || "MetaShield",
      kind: "system",
      dedupeKey: `balance_overdue:${c.id}`,
      body: `Reminder: your final balance of ${balance} was due by ${deadline}. Please pay by bank transfer and upload the receipt from your case page.`,
    });
    if (!created) continue; // already reminded
    result.overdueReminders++;
    const { data: u } = await admin.auth.admin.getUserById(c.user_id);
    if (u?.user?.email) {
      await sendCaseUpdateEmail({
        to: u.user.email,
        kind: "balance_overdue",
        clientName: (u.user.user_metadata?.full_name as string | undefined) || "there",
        caseTitle: c.title,
        balance,
        deadline,
      });
    }
    await sendStaffAlert({
      subject: `Balance overdue: ${c.title}`,
      lines: [`The final balance of ${balance} was due by ${deadline} and hasn't been verified.`],
      link: `/admin/cases/${c.id}`,
      to: [c.agent_email],
    });
  }

  // ── 2. Eligibility follow-ups ──────────────────────────────────────
  const { data: subs, error: subsError } = await admin
    .from("contact_submissions")
    .select("id, name, email, metadata, created_at")
    .eq("source", "recovery_eligibility")
    .eq("email_consent", true)
    .is("followup_status", null)
    .lt("created_at", new Date(Date.now() - DAY).toISOString())
    .gt("created_at", new Date(Date.now() - 14 * DAY).toISOString())
    .order("created_at", { ascending: true })
    .limit(50);
  if (subsError) console.error("[cron] follow-up query failed:", subsError);

  const resendKey = process.env.RESEND_API_KEY;
  for (const s of subs ?? []) {
    const email = String(s.email ?? "").trim().toLowerCase();
    // Claim the row first so overlapping runs can't both send.
    const { data: claimed } = await admin
      .from("contact_submissions")
      .update({ followup_status: "sending" })
      .eq("id", s.id)
      .is("followup_status", null)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const finish = (status: string, extra: Record<string, unknown> = {}) =>
      admin.from("contact_submissions").update({ followup_status: status, ...extra }).eq("id", s.id);

    if (!email.includes("@")) {
      await finish("skipped_no_email");
      result.followups.skipped++;
      continue;
    }
    const [{ data: unsub }, { data: recent }, { data: profile }] = await Promise.all([
      admin.from("email_unsubscribes").select("email").eq("email", email).maybeSingle(),
      admin
        .from("contact_submissions")
        .select("id")
        .ilike("email", email)
        .not("followup_sent_at", "is", null)
        .gt("followup_sent_at", new Date(Date.now() - 30 * DAY).toISOString())
        .limit(1),
      admin.from("profiles").select("id").ilike("email", email).maybeSingle(),
    ]);
    if (unsub) {
      await finish("skipped_unsubscribed");
      result.followups.skipped++;
      continue;
    }
    if ((recent ?? []).length > 0) {
      await finish("skipped_duplicate");
      result.followups.skipped++;
      continue;
    }
    if (profile) {
      const { count } = await admin.from("cases").select("id", { count: "exact", head: true }).eq("user_id", profile.id);
      if ((count ?? 0) > 0) {
        await finish("skipped_converted");
        result.followups.skipped++;
        continue;
      }
    }
    if (!resendKey) {
      await finish("failed", { followup_error: "RESEND_API_KEY not configured" });
      result.followups.failed++;
      continue;
    }
    const meta = (s.metadata ?? {}) as Record<string, unknown>;
    try {
      const { error } = await new Resend(resendKey).emails.send({
        from: process.env.RESEND_FROM_EMAIL || "MetaShield <onboarding@resend.dev>",
        to: email,
        subject: "Still need help recovering your account?",
        html: eligibilityFollowupEmail({
          name: String(s.name ?? ""),
          platform: typeof meta.platform === "string" ? meta.platform : null,
          issue: typeof meta.issue === "string" ? meta.issue : null,
          unsubscribeUrl: unsubscribeUrl(email),
        }),
        headers: { "List-Unsubscribe": `<${unsubscribeUrl(email)}>` },
      });
      if (error) throw new Error(typeof error === "object" ? JSON.stringify(error) : String(error));
      await finish("sent", { followup_sent_at: new Date().toISOString(), followup_error: null });
      result.followups.sent++;
    } catch (err) {
      console.error("[cron] follow-up send failed:", err);
      await finish("failed", { followup_error: String(err).slice(0, 500) });
      result.followups.failed++;
    }
  }

  return NextResponse.json({ ok: true, ...result });
}
