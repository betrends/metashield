// Automatic payment status for the signed-in client's Packages page.
//
// GET  → { available, autoRenew, card, nextChargeOn, failed }
//        available: card payments renew automatically (Paystack set up)
//        card: e.g. "Visa •••• 4081" (never the card codes)
// POST { action: "stop" }        → turn automatic payment off (the package
//                                  stays on until its end date)
// POST { action: "update_card" } → { url } Paystack's page to change card

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";
import { paystackEnabled, paystackManageLink } from "@/lib/server/paystack";
import { billingRowFor, stopAutoRenew } from "@/lib/server/paystack-autopay";

async function signedInUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const available = paystackEnabled();
  if (!available) return NextResponse.json({ available, autoRenew: false, card: null, nextChargeOn: null, failed: false });
  const row = await billingRowFor(createAdminClient(), user.id);
  const brand = row?.card_brand ? row.card_brand.charAt(0).toUpperCase() + row.card_brand.slice(1).toLowerCase() : "Card";
  return NextResponse.json({
    available,
    autoRenew: !!row?.auto_renew,
    card: row?.card_last4 ? `${brand} •••• ${row.card_last4}` : null,
    nextChargeOn: row?.auto_renew ? row.next_charge_on : null,
    failed: !!row?.last_failed_at,
  });
}

export async function POST(request: Request) {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const admin = createAdminClient();

  if (body.action === "stop") {
    const ok = await stopAutoRenew(admin, user.id);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "autopay_stop_failed" }, { status: 502 });
  }

  if (body.action === "update_card") {
    const row = await billingRowFor(admin, user.id);
    if (!row?.subscription_code || !row.auto_renew) {
      return NextResponse.json({ error: "no_autopay" }, { status: 404 });
    }
    const url = await paystackManageLink(row.subscription_code);
    return url ? NextResponse.json({ url }) : NextResponse.json({ error: "paystack_error" }, { status: 502 });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
