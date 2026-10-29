// Daily job (Vercel Cron, see vercel.json). Safe to run more than once:
//  1. Overdue final balances — post one reminder in the case chat and
//     email the client and the team, once per case (de-duplicated).
//  2. Follow-ups — one email, 24 hours later, to people who left "email me"
//     ticked on the recovery eligibility check (recovery email) or the
//     account health check (packages email). Skips unsubscribed addresses,
//     people who already became clients (a case or an active package) and
//     addresses emailed in the last 30 days. Every outcome is logged on the
//     submission (followup_status / followup_sent_at / followup_error).
//  3. Package renewal reminders — an email when a package has 3 days left
//     and one the morning after it ends, each with a "Renew now" button
//     straight to card payment. Once per package period (package_reminders).

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/server";
import { sendCaseUpdateEmail } from "@/lib/email/case-update";
import { sendStaffAlert } from "@/lib/email/staff-alert";
import { eligibilityFollowupEmail, packageRenewalEmail, protectionFollowupEmail } from "@/lib/email-templates";
import { getPlan, isPlanId } from "@/lib/portal/billing";
import { activePackageFor } from "@/lib/server/packages";
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
  const result = {
    overdueReminders: 0,
    followups: { sent: 0, skipped: 0, failed: 0 },
    renewals: { sent: 0, skipped: 0, failed: 0 },
  };

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

  // ── 2. Follow-ups (eligibility check + account health check) ──────
  const { data: subs, error: subsError } = await admin
    .from("contact_submissions")
    .select("id, source, name, email, metadata, created_at")
    .in("source", ["recovery_eligibility", "health_check"])
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
    const isHealthCheck = s.source === "health_check";
    if (profile) {
      // Already a client: has an active package, or (for recovery) a case.
      const [pkg, { count }] = await Promise.all([
        activePackageFor(admin, profile.id as string),
        isHealthCheck
          ? Promise.resolve({ count: 0 })
          : admin.from("cases").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
      ]);
      if (pkg || (count ?? 0) > 0) {
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
        subject: isHealthCheck ? "Keep your account protected — recovery included" : "Still need help recovering your account?",
        html: isHealthCheck
          ? protectionFollowupEmail({
              name: String(s.name ?? ""),
              platform: typeof meta.platform === "string" ? meta.platform : null,
              handle: typeof meta.handle === "string" ? meta.handle : null,
              riskLevel: typeof meta.riskLevel === "string" ? meta.riskLevel : null,
              unsubscribeUrl: unsubscribeUrl(email),
            })
          : eligibilityFollowupEmail({
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

  // ── 3. Package renewal reminders ──────────────────────────────────
  const now = Date.now();
  const { data: packages, error: pkgError } = await admin
    .from("subscriptions")
    .select("id, user_id, plan_id, renews_on")
    .eq("status", "active")
    .not("renews_on", "is", null)
    .lt("renews_on", new Date(now + 4 * DAY).toISOString())
    .gt("renews_on", new Date(now - 3 * DAY).toISOString())
    .limit(200);
  if (pkgError) console.error("[cron] renewal query failed:", pkgError);

  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  for (const p of packages ?? []) {
    if (!isPlanId(p.plan_id)) continue; // old plans: no reminders
    // A package is valid through the whole of its end date.
    const endsAt = new Date(String(p.renews_on).slice(0, 10) + "T00:00:00Z").getTime() + DAY;
    // Ends within 3 days → "ending soon"; the morning after → "ended".
    const kind: "ending_soon" | "ended" | null =
      endsAt <= now ? "ended" : endsAt - now <= 3 * DAY ? "ending_soon" : null;
    if (!kind) continue;
    const periodEnd = String(p.renews_on).slice(0, 10);

    // Claim this reminder first (unique per package period), so it's sent once.
    const { data: claim, error: claimError } = await admin
      .from("package_reminders")
      .insert({ subscription_id: p.id, kind, period_end: periodEnd })
      .select("id")
      .maybeSingle();
    if (claimError || !claim) {
      if (claimError && claimError.code !== "23505") console.error("[cron] renewal claim failed:", claimError);
      continue; // already sent (or being sent)
    }
    const mark = (status: string, error: string | null = null) =>
      admin.from("package_reminders").update({ status, error }).eq("id", claim.id);

    const { data: userData } = await admin.auth.admin.getUserById(p.user_id as string);
    const user = userData?.user;
    if (!user?.email) {
      await mark("skipped", "no email");
      result.renewals.skipped++;
      continue;
    }
    if (!resendKey) {
      await mark("failed", "RESEND_API_KEY not configured");
      result.renewals.failed++;
      continue;
    }
    const plan = getPlan(p.plan_id);
    try {
      const { error } = await new Resend(resendKey).emails.send({
        from: process.env.RESEND_FROM_EMAIL || "MetaShield <onboarding@resend.dev>",
        to: user.email,
        subject: kind === "ended" ? `Your ${plan.name} package has ended — renew now` : `Your ${plan.name} package ends soon`,
        html: packageRenewalEmail({
          name: (user.user_metadata?.full_name as string | undefined) || "there",
          planName: plan.name,
          price: plan.price,
          priceSuffix: plan.priceSuffix ?? "",
          endsOn: p.renews_on as string,
          kind,
          renewUrl: `${portalUrl}/portal/billing?plan=${plan.id}&pay=1`,
        }),
      });
      if (error) throw new Error(typeof error === "object" ? JSON.stringify(error) : String(error));
      await mark("sent");
      result.renewals.sent++;
    } catch (err) {
      console.error("[cron] renewal email failed:", err);
      await mark("failed", String(err).slice(0, 500));
      result.renewals.failed++;
    }
  }

  return NextResponse.json({ ok: true, ...result });
}
