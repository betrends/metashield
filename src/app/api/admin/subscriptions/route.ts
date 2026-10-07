// Lists every Account Protection subscription with the client attached,
// plus lifetime invoice totals per subscription — the admin's view of
// recurring revenue. Gated to ADMIN_EMAIL.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!user || !adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const admin = createAdminClient();

  const [{ data: subs, error }, { data: invoices }] = await Promise.all([
    admin
      .from("subscriptions")
      .select("id, user_id, plan_id, status, renews_on, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("invoices")
      .select("subscription_id, amount_kobo, status")
      .not("subscription_id", "is", null),
  ]);

  if (error) {
    console.error("Failed to list subscriptions:", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const paidTotalBySub = new Map<string, number>();
  for (const inv of invoices ?? []) {
    if (inv.status === "paid" && inv.subscription_id) {
      paidTotalBySub.set(inv.subscription_id, (paidTotalBySub.get(inv.subscription_id) ?? 0) + (inv.amount_kobo ?? 0));
    }
  }

  const withClients = await Promise.all(
    (subs ?? []).map(async (s) => {
      const { data: userData } = await admin.auth.admin.getUserById(s.user_id);
      return {
        id: s.id,
        planId: s.plan_id,
        status: s.status,
        renewsOn: s.renews_on,
        startedAt: s.created_at,
        lifetimePaidKobo: paidTotalBySub.get(s.id) ?? 0,
        clientName: (userData?.user?.user_metadata?.full_name as string | undefined) || null,
        clientEmail: userData?.user?.email || null,
      };
    })
  );

  return NextResponse.json({ subscriptions: withClients });
}
