// Everything staff need about one case, from the database: details,
// payment record and ledger, documents (with review status and signed
// links), the recovery form, stage history (audit), timeline and the
// next action. The admin may open any case; an agent only their own.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { canAccessCase, getAdminRole } from "@/lib/admin/auth";
import { PAYMENT_COLUMNS, pickPaymentRecord, summarizePayment } from "@/lib/portal/payments";
import { allowedNextStages, nextAction, type CaseDocument } from "@/lib/portal/workflow";
import type { CaseStage } from "@/lib/portal/mock-data";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getAdminRole();
  if (!role) return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  if (!(await canAccessCase(role, id))) return NextResponse.json({ error: "not_authorized" }, { status: 403 });

  const admin = createAdminClient();
  const { data: kase, error } = await admin
    .from("cases")
    .select(
      `id, user_id, title, platform, account_handle, issue, stage, created_at, agent_id, agent_name, agent_email, agent_phone, screenshot_url, receipt_storage_path, balance_receipt_storage_path, cancelled_at, cancelled_by, cancellation_requested_at, cancellation_reason, terms_accepted_at, ${PAYMENT_COLUMNS}`
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !kase) return NextResponse.json({ error: "case_not_found" }, { status: 404 });

  const [userRes, docsRes, ledgerRes, historyRes, timelineRes, formRes, termsRes, unreadRes] = await Promise.all([
    admin.auth.admin.getUserById(kase.user_id),
    admin
      .from("documents")
      .select("id, name, category, size_bytes, mime_type, storage_path, created_at, review_status, reviewed_at, reviewed_by, review_note")
      .eq("case_id", id)
      .order("created_at", { ascending: true }),
    admin.from("payment_ledger").select("*").eq("case_id", id).order("submitted_at", { ascending: true }),
    admin.from("case_stage_history").select("*").eq("case_id", id).order("created_at", { ascending: true }),
    admin.from("case_timeline_events").select("event, created_at").eq("case_id", id).order("created_at", { ascending: true }),
    admin.from("recovery_form_submissions").select("answers, form_version, submitted_at").eq("case_id", id).maybeSingle(),
    admin.from("case_terms_acceptances").select("terms_version, accepted_at").eq("case_id", id).order("accepted_at", { ascending: true }),
    admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("case_id", id)
      .eq("from_role", "client")
      .is("read_at", null),
  ]);

  async function sign(path: string | null) {
    if (!path) return null;
    const { data } = await admin.storage.from("documents").createSignedUrl(path, 60 * 10);
    return data?.signedUrl ?? null;
  }

  const docs = (docsRes.data ?? []) as (CaseDocument & Record<string, unknown>)[];
  const payment = pickPaymentRecord(kase);
  const summary = summarizePayment(payment);
  const stage = kase.stage as CaseStage;

  return NextResponse.json({
    role: role.type,
    case: {
      id: kase.id,
      userId: kase.user_id,
      title: kase.title,
      platform: kase.platform,
      accountHandle: kase.account_handle,
      issue: kase.issue,
      stage,
      createdAt: kase.created_at,
      agentId: kase.agent_id,
      agentName: kase.agent_name,
      agentEmail: kase.agent_email,
      screenshotUrl: kase.screenshot_url,
      cancelledAt: kase.cancelled_at,
      cancelledBy: kase.cancelled_by,
      cancellationRequestedAt: kase.cancellation_requested_at,
      cancellationReason: kase.cancellation_reason,
      clientName: (userRes.data?.user?.user_metadata?.full_name as string | undefined) || null,
      clientEmail: userRes.data?.user?.email || null,
      allowedNextStages: allowedNextStages(stage),
      nextAction: nextAction({
        stage,
        depositConfirmed: summary.depositConfirmed,
        depositStatus: summary.depositStatus,
        balanceStatus: summary.balanceStatus,
        cancelled: !!kase.cancelled_at,
        cancellationRequested: !!kase.cancellation_requested_at,
        docs,
        formSubmitted: !!formRes.data,
      }).staff,
      unreadClientMessages: unreadRes.count ?? 0,
    },
    payment,
    receipts: {
      deposit: await sign(kase.receipt_storage_path),
      balance: await sign(kase.balance_receipt_storage_path),
    },
    ledger: ledgerRes.data ?? [],
    documents: await Promise.all(
      docs.map(async (d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        sizeBytes: d.size_bytes,
        mimeType: d.mime_type,
        createdAt: d.created_at,
        reviewStatus: d.review_status,
        reviewedAt: d.reviewed_at,
        reviewedBy: d.reviewed_by,
        reviewNote: d.review_note,
        url: await sign((d.storage_path as string | null) ?? null),
      }))
    ),
    form: formRes.data ?? null,
    terms: termsRes.data ?? [],
    history: historyRes.data ?? [],
    timeline: timelineRes.data ?? [],
  });
}
