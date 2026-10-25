import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminRole } from "@/lib/admin/auth";
import { PAYMENT_COLUMNS, pickPaymentRecord } from "@/lib/portal/payments";
import { allowedNextStages } from "@/lib/portal/workflow";
import type { CaseStage } from "@/lib/portal/mock-data";

export async function GET() {
  const role = await getAdminRole();
  if (!role) return NextResponse.json({ error: "not_authorized" }, { status: 403 });

  const admin = createAdminClient();
  let query = admin
    .from("cases")
    .select(
      `id, user_id, title, platform, account_handle, stage, agent_name, issue, created_at, screenshot_url, cancelled_at, cancellation_requested_at, ${PAYMENT_COLUMNS}`
    )
    .order("created_at", { ascending: false });

  if (role.type === "agent") {
    query = query.eq("agent_id", role.agentId);
  }

  const { data: cases, error } = await query;
  if (error) {
    console.error("Failed to list cases:", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const withClients = await Promise.all(
    (cases ?? []).map(async (row) => {
      const { data: userData } = await admin.auth.admin.getUserById(row.user_id);
      return {
        id: row.id,
        title: row.title,
        platform: row.platform,
        accountHandle: row.account_handle,
        stage: row.stage,
        paymentStatus: row.payment_status,
        // Same authoritative record every portal reads (lib/portal/payments.ts).
        payment: pickPaymentRecord(row),
        cancelledAt: row.cancelled_at ?? null,
        cancellationRequestedAt: row.cancellation_requested_at ?? null,
        allowedNextStages: allowedNextStages(row.stage as CaseStage),
        agentName: row.agent_name,
        issue: row.issue,
        createdAt: row.created_at,
        clientName: (userData?.user?.user_metadata?.full_name as string | undefined) || null,
        clientEmail: userData?.user?.email || null,
        screenshotUrl: row.screenshot_url || null,
      };
    })
  );

  return NextResponse.json({ cases: withClients, role: role.type });
}
