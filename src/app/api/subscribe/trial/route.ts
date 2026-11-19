// "Start your free month" on Watch or Elite. No card, no payment.
//
// Only for clients who have never had a package (one free month per
// client). The package runs as "trial" for one month: the client gets the
// protection checklist and their agent, but account recovery at no extra
// cost only starts with their first payment (it counts "active" packages
// only — lib/server/packages.ts). Reminders before the month ends come from
// the daily job (api/cron/daily).
//
// 401 → sign in first. 409 → the free month isn't available (already had a
// package): the page offers normal payment instead.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";
import { addOneMonth, getPlan, hasFreeFirstMonth } from "@/lib/portal/billing";
import { sendProtectionChecklist } from "@/lib/server/protection-checklist";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let body: { planId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!hasFreeFirstMonth(body.planId)) return NextResponse.json({ error: "no_free_month" }, { status: 400 });
  const plan = getPlan(String(body.planId));

  const admin = createAdminClient();
  const { data: existing, error: readError } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);
  if (readError) {
    console.error("[trial] read failed:", readError);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  // Anyone who has had a package before (or already started a free month).
  if ((existing ?? []).length > 0) return NextResponse.json({ error: "free_month_used" }, { status: 409 });

  const endsOn = addOneMonth(new Date().toISOString());
  const { error } = await admin
    .from("subscriptions")
    .insert({ user_id: user.id, plan_id: plan.id, status: "trial", renews_on: endsOn });
  if (error) {
    // 23514: the database doesn't allow free months yet (migration 019).
    if ((error as { code?: string }).code === "23514") return NextResponse.json({ error: "setup_needed" }, { status: 500 });
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "free_month_used" }, { status: 409 });
    console.error("[trial] insert failed:", error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const checklistSent = user.email
    ? await sendProtectionChecklist({
        to: user.email,
        clientName: (user.user_metadata?.full_name as string | undefined) || "",
        planName: `${plan.name} free month`,
      })
    : false;

  return NextResponse.json({ ok: true, planId: plan.id, planName: plan.name, endsOn, checklistSent });
}
