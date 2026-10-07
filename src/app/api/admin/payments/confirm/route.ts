// Admin marks a case's bank-transfer payment as confirmed: advances the
// case, logs it, and lets the client know. Gated to ADMIN_EMAIL.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminUser || !adminEmail || adminUser.email !== adminEmail) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  let body: { caseId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  if (!caseId) {
    return NextResponse.json({ error: "missing_case_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: updatedCase, error } = await admin
    .from("cases")
    .update({ payment_status: "paid", stage: "Documents Required" })
    .eq("id", caseId)
    .select("id, title, user_id, agent_name, fee_amount_kobo")
    .single();

  if (error || !updatedCase) {
    console.error("Failed to confirm payment:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  await admin.from("case_timeline_events").insert({
    case_id: caseId,
    event: "Payment confirmed — recovery started",
  });

  await admin.from("messages").insert({
    user_id: updatedCase.user_id,
    case_id: caseId,
    from_role: "team",
    author_name: updatedCase.agent_name || "Your agent",
    body: "Payment received and confirmed, thank you! I'm starting the recovery process now and will keep you posted here.",
  });

  const { data: clientData } = await admin.auth.admin.getUserById(updatedCase.user_id);
  const clientEmail = clientData?.user?.email;
  if (clientEmail) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    fetch(`${appUrl}/api/case-update-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: clientEmail,
        clientName: (clientData?.user?.user_metadata?.full_name as string | undefined) || "there",
        caseTitle: updatedCase.title,
        kind: "payment_confirmed",
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
