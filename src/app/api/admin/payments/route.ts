// Payment work queue for the admin: every case with an installment that
// still needs attention —
//   deposit: unpaid / pending_review (receipt to verify) / failed
//   balance: due / pending_review (receipt to verify) / failed
// Each row carries the authoritative payment record (lib/portal/payments.ts)
// and a short-lived link to whichever receipt was uploaded. Gated to
// ADMIN_EMAIL; everyone else gets 403.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminRole } from "@/lib/admin/auth";
import { PAYMENT_COLUMNS, pickPaymentRecord } from "@/lib/portal/payments";

type CaseRow = {
  id: string;
  user_id: string;
  title: string;
  platform: string;
  account_handle: string;
  issue: string | null;
  stage: string;
  agent_name: string | null;
  created_at: string;
  receipt_storage_path: string | null;
  balance_receipt_storage_path: string | null;
} & Record<string, unknown>;

export async function GET() {
  const role = await getAdminRole();
  if (!role || role.type !== "admin") {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("cases")
    .select(
      `id, user_id, title, platform, account_handle, issue, stage, agent_name, created_at, receipt_storage_path, balance_receipt_storage_path, ${PAYMENT_COLUMNS}`
    )
    .or("payment_status.in.(unpaid,pending_review,failed),balance_status.in.(due,pending_review,failed)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list pending payments:", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as CaseRow[];

  async function sign(path: string | null) {
    if (!path) return null;
    const { data: signed } = await adminClient.storage.from("documents").createSignedUrl(path, 60 * 10);
    return signed?.signedUrl ?? null;
  }

  const cases = await Promise.all(
    rows.map(async (row) => {
      const { data: userData } = await adminClient.auth.admin.getUserById(row.user_id);
      const payment = pickPaymentRecord(row);
      return {
        id: row.id,
        title: row.title,
        platform: row.platform,
        accountHandle: row.account_handle,
        issue: row.issue,
        stage: row.stage,
        agentName: row.agent_name,
        createdAt: row.created_at,
        clientName: (userData?.user?.user_metadata?.full_name as string | undefined) || null,
        clientEmail: userData?.user?.email || null,
        payment,
        // Kept for older clients of this API.
        feeAmountKobo: payment.fee_amount_kobo,
        paymentStatus: payment.payment_status,
        receiptUrl: await sign(row.receipt_storage_path),
        balanceReceiptUrl: await sign(row.balance_receipt_storage_path),
      };
    })
  );

  return NextResponse.json({ cases });
}
