// Admin → Email users. Admin only.
//
// GET  ?preview=1 → the email as a web page (sample name), for the preview.
// GET  ?clients=all|no_package|none&leads=1
//        → how many people the email would reach, the last few sends, and
//          whether a real sending address is set up. No addresses are
//          returned to the browser.
// POST { action: "count", clients, leads, extra }
//        → the count again, including pasted emails (and which ones look wrong).
// POST { action: "test", subject }
//        → sends the email only to the admin's own address.
// POST { action: "send", subject, clients, leads, extra, extraConsent, requestId }
//        → sends to everyone in the audience, 100 per batch through Resend.
//          Every recipient is logged (email_broadcast_recipients) so the same
//          send can never email anyone twice; requestId stops a double click
//          or a retried request from starting a second send.
// POST { action: "resume", broadcastId }
//        → sends to anyone a stopped send hadn't reached yet, and retries
//          the ones that failed.

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminRole } from "@/lib/admin/auth";
import { buildRecipients, parseAudience, parseExtraEmails, senderReady, type Recipient } from "@/lib/server/broadcast";
import { packagesAnnouncementEmail, PACKAGES_ANNOUNCEMENT_SUBJECT } from "@/lib/email-templates";
import { unsubscribeUrl } from "@/lib/server/unsubscribe";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH = 100;
const STALE_MS = 15 * 60 * 1000; // a send still "sending" after this has stopped

function cleanSubject(v: unknown): string {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 150) : "";
  return s || PACKAGES_ANNOUNCEMENT_SUBJECT;
}

function emailFor(r: Pick<Recipient, "email" | "name" | "kind">, subject: string) {
  const unsub = unsubscribeUrl(r.email);
  return {
    from: process.env.RESEND_FROM_EMAIL || "MetaShield <onboarding@resend.dev>",
    to: [r.email],
    subject,
    html: packagesAnnouncementEmail({ name: r.name, unsubscribeUrl: unsub, reason: r.kind }),
    headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}

export async function GET(request: Request) {
  const role = await getAdminRole();
  if (!role || role.type !== "admin") return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  const url = new URL(request.url);
  if (url.searchParams.get("preview") === "1") {
    // What the email looks like (sample name), for the page's preview.
    const html = packagesAnnouncementEmail({ name: "Sample Client", unsubscribeUrl: "#", reason: "client" });
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  }
  const audience = parseAudience({ clients: url.searchParams.get("clients") ?? "all", leads: url.searchParams.get("leads") ?? "1" });
  const admin = createAdminClient();
  let count = 0;
  try {
    count = audience ? (await buildRecipients(admin, audience)).length : 0;
  } catch (err) {
    console.error("[broadcast] count failed:", err);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }
  const { data: history, error: historyError } = await admin
    .from("email_broadcasts")
    .select("id, subject, audience, status, recipient_count, sent_count, failed_count, created_at, finished_at")
    .order("created_at", { ascending: false })
    .limit(10);
  const sender = senderReady();
  return NextResponse.json({
    count,
    history: history ?? [],
    setupNeeded: !!historyError, // the email_broadcasts table (migration 016) isn't there yet
    sender: { ok: sender.ok, from: sender.from },
    adminEmail: role.email,
    defaultSubject: PACKAGES_ANNOUNCEMENT_SUBJECT,
  });
}

export async function POST(request: Request) {
  const role = await getAdminRole();
  if (!role || role.type !== "admin") return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // ── Count: how many people the email would reach (incl. pasted emails) ──
  if (body.action === "count") {
    const { valid, invalid } = parseExtraEmails(body.extra);
    const audience = parseAudience({ clients: body.clients, leads: body.leads, extra: body.extra });
    try {
      const count = audience ? (await buildRecipients(createAdminClient(), audience)).length : 0;
      return NextResponse.json({ count, extraValid: valid.length, invalid });
    } catch (err) {
      console.error("[broadcast] count failed:", err);
      return NextResponse.json({ error: "query_failed" }, { status: 500 });
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "email_not_configured" }, { status: 503 });
  const resend = new Resend(resendKey);
  const admin = createAdminClient();

  // ── Test: only to the admin ──
  if (body.action === "test") {
    const subject = cleanSubject(body.subject);
    const { error } = await resend.emails.send({
      ...emailFor({ email: role.email, name: "", kind: "client" }, `[TEST] ${subject}`),
      to: role.email,
    });
    if (error) {
      console.error("[broadcast] test failed:", error);
      return NextResponse.json({ error: "send_failed", detail: typeof error === "object" ? JSON.stringify(error) : String(error) }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sentTo: role.email });
  }

  let broadcastId: string;
  let subject: string;

  if (body.action === "send") {
    const audience = parseAudience({ clients: body.clients, leads: body.leads, extra: body.extra });
    if (!audience) return NextResponse.json({ error: "invalid_audience" }, { status: 400 });
    // Pasted emails: the admin confirms these people know MetaShield.
    if (audience.extra.length > 0 && body.extraConsent !== true) return NextResponse.json({ error: "extra_consent_required" }, { status: 400 });
    const requestId = typeof body.requestId === "string" ? body.requestId.slice(0, 80) : "";
    if (!requestId) return NextResponse.json({ error: "missing_request_id" }, { status: 400 });
    subject = cleanSubject(body.subject);

    // Only one send at a time.
    const { data: running } = await admin
      .from("email_broadcasts")
      .select("id")
      .eq("status", "sending")
      .gt("started_at", new Date(Date.now() - STALE_MS).toISOString())
      .limit(1);
    if ((running ?? []).length > 0) return NextResponse.json({ error: "already_sending" }, { status: 409 });

    const { data: created, error: createError } = await admin
      .from("email_broadcasts")
      .insert({
        request_id: requestId,
        subject,
        template: "packages_announcement",
        audience: { clients: audience.clients, leads: audience.leads, extraCount: audience.extra.length },
        created_by: role.email,
        status: "sending",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (createError || !created) {
      if ((createError as { code?: string } | null)?.code === "23505") return NextResponse.json({ error: "already_started" }, { status: 409 });
      console.error("[broadcast] create failed:", createError);
      return NextResponse.json({ error: "setup_needed" }, { status: 500 });
    }
    broadcastId = created.id as string;

    let recipients: Recipient[];
    try {
      recipients = await buildRecipients(admin, audience);
    } catch (err) {
      await admin.from("email_broadcasts").update({ status: "failed", error: String(err).slice(0, 500), finished_at: new Date().toISOString() }).eq("id", broadcastId);
      return NextResponse.json({ error: "query_failed" }, { status: 500 });
    }
    for (let i = 0; i < recipients.length; i += 500) {
      const { error } = await admin.from("email_broadcast_recipients").upsert(
        recipients.slice(i, i + 500).map((r) => ({ broadcast_id: broadcastId, email: r.email, name: r.name, kind: r.kind, status: "pending" })),
        { onConflict: "broadcast_id,email", ignoreDuplicates: true }
      );
      if (error) {
        await admin.from("email_broadcasts").update({ status: "failed", error: "could not save recipients", finished_at: new Date().toISOString() }).eq("id", broadcastId);
        console.error("[broadcast] recipients insert failed:", error);
        // 23514: the database doesn't allow pasted emails yet (migration 017).
        if ((error as { code?: string }).code === "23514") return NextResponse.json({ error: "setup_needed_extra" }, { status: 500 });
        return NextResponse.json({ error: "db_error" }, { status: 500 });
      }
    }
    await admin.from("email_broadcasts").update({ recipient_count: recipients.length }).eq("id", broadcastId);
  } else if (body.action === "resume") {
    broadcastId = typeof body.broadcastId === "string" ? body.broadcastId : "";
    const { data: b } = await admin.from("email_broadcasts").select("id, subject, status, started_at").eq("id", broadcastId).maybeSingle();
    if (!b) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (b.status === "sending" && new Date(b.started_at as string).getTime() > Date.now() - STALE_MS)
      return NextResponse.json({ error: "already_sending" }, { status: 409 });
    // Claim it so two resumes can't run together.
    const { data: claimed } = await admin
      .from("email_broadcasts")
      .update({ status: "sending", started_at: new Date().toISOString() })
      .eq("id", broadcastId)
      .eq("status", b.status as string)
      .select("id")
      .maybeSingle();
    if (!claimed) return NextResponse.json({ error: "already_sending" }, { status: 409 });
    subject = b.subject as string;
    // Retry the ones that failed (e.g. a daily limit was hit). People whose
    // batch was cut off mid-send ("sending") are left alone — they may
    // already have the email.
    await admin
      .from("email_broadcast_recipients")
      .update({ status: "pending", error: null })
      .eq("broadcast_id", broadcastId)
      .eq("status", "failed");
  } else {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  // ── Send everyone still pending, 100 at a time ──
  let sent = 0;
  let failed = 0;
  for (;;) {
    const { data: batch } = await admin
      .from("email_broadcast_recipients")
      .select("id, email, name, kind")
      .eq("broadcast_id", broadcastId)
      .eq("status", "pending")
      .order("id", { ascending: true })
      .limit(BATCH);
    const rows = (batch ?? []) as { id: number; email: string; name: string | null; kind: Recipient["kind"] }[];
    if (rows.length === 0) break;
    // Mark the batch as taken before sending, so nobody is emailed twice
    // even if this request is cut off mid-way.
    const ids = rows.map((r) => r.id);
    await admin.from("email_broadcast_recipients").update({ status: "sending" }).in("id", ids);
    const { error } = await resend.batch.send(rows.map((r) => emailFor({ email: r.email, name: r.name ?? "", kind: r.kind }, subject)));
    if (error) {
      console.error("[broadcast] batch failed:", error);
      const message = (typeof error === "object" ? JSON.stringify(error) : String(error)).slice(0, 500);
      await admin.from("email_broadcast_recipients").update({ status: "failed", error: message }).in("id", ids);
      failed += rows.length;
      // A limit or setup problem will fail every batch; stop instead of
      // burning through the list.
      if (/rate|limit|quota|domain|verify|from/i.test(message)) break;
      continue;
    }
    await admin.from("email_broadcast_recipients").update({ status: "sent", sent_at: new Date().toISOString() }).in("id", ids);
    sent += rows.length;
  }

  // Totals from the log (covers earlier attempts of a resumed send).
  const [{ count: sentTotal }, { count: failedTotal }, { count: leftTotal }] = await Promise.all([
    admin.from("email_broadcast_recipients").select("id", { count: "exact", head: true }).eq("broadcast_id", broadcastId).eq("status", "sent"),
    admin.from("email_broadcast_recipients").select("id", { count: "exact", head: true }).eq("broadcast_id", broadcastId).eq("status", "failed"),
    admin.from("email_broadcast_recipients").select("id", { count: "exact", head: true }).eq("broadcast_id", broadcastId).eq("status", "pending"),
  ]);
  await admin
    .from("email_broadcasts")
    .update({
      status: (leftTotal ?? 0) > 0 ? "stopped" : (sentTotal ?? 0) === 0 && (failedTotal ?? 0) > 0 ? "failed" : "done",
      sent_count: sentTotal ?? 0,
      failed_count: failedTotal ?? 0,
      finished_at: new Date().toISOString(),
    })
    .eq("id", broadcastId);

  return NextResponse.json({ ok: true, broadcastId, sent, failed, left: leftTotal ?? 0 });
}
