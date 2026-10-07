// Lists every case that hasn't been paid yet — "unpaid" (client hasn't
// submitted anything) and "pending_review" (receipt submitted, needs a
// human to confirm it actually landed in the bank account). Gated to
// whichever email is set as ADMIN_EMAIL; everyone else gets 403.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!user || !adminEmail || user.email !== adminEmail) {
    return null;
  }
  return user;
}

type CaseRow = {
  id: string;
  user_id: string;
  title: string;
  platform: string;
  account_handle: string;
  issue: string | null;
  fee_amount_kobo: number | null;
  payment_status: "unpaid" | "pending_review" | "paid" | "failed";
  receipt_storage_path: string | null;
  agent_name: string | null;
  created_at: string;
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("cases")
    .select(
      "id, user_id, title, platform, account_handle, issue, fee_amount_kobo, payment_status, receipt_storage_path, agent_name, created_at"
    )
    .in("payment_status", ["unpaid", "pending_review"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list pending payments:", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const rows = data as CaseRow[];

  const withClientAndReceipt = await Promise.all(
    rows.map(async (row) => {
      const { data: userData } = await adminClient.auth.admin.getUserById(row.user_id);
      let receiptUrl: string | null = null;
      if (row.receipt_storage_path) {
        const { data: signed } = await adminClient.storage
          .from("documents")
          .createSignedUrl(row.receipt_storage_path, 60 * 10); // 10 minutes
        receiptUrl = signed?.signedUrl ?? null;
      }
      return {
        id: row.id,
        title: row.title,
        platform: row.platform,
        accountHandle: row.account_handle,
        issue: row.issue,
        feeAmountKobo: row.fee_amount_kobo,
        paymentStatus: row.payment_status,
        agentName: row.agent_name,
        createdAt: row.created_at,
        clientName: (userData?.user?.user_metadata?.full_name as string | undefined) || null,
        clientEmail: userData?.user?.email || null,
        receiptUrl,
      };
    })
  );

  return NextResponse.json({ cases: withClientAndReceipt });
}
