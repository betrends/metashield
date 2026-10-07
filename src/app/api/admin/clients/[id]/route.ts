// Full detail for one client: profile, accounts, cases, subscription.
// Gated to ADMIN_EMAIL.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!user || !adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const admin = createAdminClient();

  const [{ data: authUser }, { data: accounts }, { data: cases }, { data: subscription }] =
    await Promise.all([
      admin.auth.admin.getUserById(id),
      admin
        .from("accounts")
        .select("id, handle, platform, health, level, protection_active, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
      admin
        .from("cases")
        .select("id, title, platform, stage, payment_status, fee_amount_kobo, agent_name, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
      admin
        .from("subscriptions")
        .select("plan_id, status, renews_on")
        .eq("user_id", id)
        .eq("status", "active")
        .maybeSingle(),
    ]);

  if (!authUser?.user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    client: {
      id,
      name: (authUser.user.user_metadata?.full_name as string | undefined) || null,
      email: authUser.user.email || null,
      phone: (authUser.user.user_metadata?.phone as string | undefined) || null,
      joinedAt: authUser.user.created_at,
    },
    accounts: (accounts ?? []).map((a) => ({
      id: a.id,
      handle: a.handle,
      platform: a.platform,
      health: a.health,
      level: a.level,
      protectionActive: a.protection_active,
      createdAt: a.created_at,
    })),
    cases: (cases ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      platform: c.platform,
      stage: c.stage,
      paymentStatus: c.payment_status,
      feeAmountKobo: c.fee_amount_kobo,
      agentName: c.agent_name,
      createdAt: c.created_at,
    })),
    subscription: subscription
      ? { planId: subscription.plan_id, status: subscription.status, renewsOn: subscription.renews_on }
      : null,
  });
}
