// Confirms a card payment and switches the package on. Called by the
// Packages page when the client comes back from checkout with
// ?kpref=<reference>. References starting "msp-" are Paystack payments
// (monthly and yearly packages then renew automatically), the rest Korapay.
// Paystack also sends its own notification (/api/paystack/webhook); a
// payment is only ever counted once.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";
import { getPlan, isPlanId } from "@/lib/portal/billing";
import { activatePaidPackage } from "@/lib/server/activate-package";
import { isPaystackReference, metadataOf, verifyPaystackTransaction } from "@/lib/server/paystack";
import { setupAutoRenew } from "@/lib/server/paystack-autopay";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: { reference?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  if (!reference) {
    return NextResponse.json({ error: "missing_reference" }, { status: 400 });
  }

  const clientName = (user.user_metadata?.full_name as string | undefined) || "";

  // ── Paystack ──
  if (isPaystackReference(reference)) {
    const res = await verifyPaystackTransaction(reference);
    const tx = res.data;
    if (!res.status || !tx || tx.status !== "success") {
      console.error("Paystack verify failed:", res.message, tx?.status);
      return NextResponse.json({ error: "payment_not_successful", detail: res.message }, { status: 400 });
    }
    const md = metadataOf(tx);
    // The payment must belong to the signed-in client.
    if (md.userId !== user.id) {
      return NextResponse.json({ error: "reference_not_yours" }, { status: 403 });
    }
    if (!isPlanId(md.planId)) {
      return NextResponse.json({ error: "invalid_plan_in_metadata" }, { status: 400 });
    }
    const plan = getPlan(md.planId);
    const amountKobo = Number(tx.amount ?? 0);
    if (amountKobo < plan.priceKobo || (tx.currency && tx.currency !== "NGN")) {
      console.error("Paystack amount below package price:", { reference, amountKobo, plan: plan.id });
      return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
    }
    const admin = createAdminClient();
    const result = await activatePaidPackage(admin, {
      userId: user.id,
      email: user.email ?? null,
      clientName,
      plan,
      reference,
      amountKobo,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    let autoRenew = false;
    if (!result.alreadyRecorded && user.email) {
      autoRenew = (await setupAutoRenew(admin, { userId: user.id, email: user.email, plan, tx, renewsOn: result.renewsOn })).autoRenew;
    }
    return NextResponse.json({
      ok: true,
      planId: plan.id,
      planName: plan.name,
      checklistSent: result.checklistSent,
      alreadyRecorded: result.alreadyRecorded,
      autoRenew,
    });
  }

  // ── Korapay ──
  const secretKey = process.env.KORAPAY_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "KORAPAY_SECRET_KEY not configured" }, { status: 500 });
  }

  const res = await fetch(`https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const data = await res.json();

  if (!data.status || data.data?.status !== "success") {
    console.error("Korapay verify failed:", data);
    return NextResponse.json({ error: "payment_not_successful", detail: data.message }, { status: 400 });
  }

  const planId = data.data?.metadata?.planId as unknown;
  if (!isPlanId(planId)) {
    return NextResponse.json({ error: "invalid_plan_in_metadata" }, { status: 400 });
  }

  const plan = getPlan(planId);
  // The amount actually paid (Korapay reports Naira) must cover the package.
  const paidNaira = Number(data.data?.amount_paid ?? data.data?.amount ?? 0);
  if (!(paidNaira * 100 >= plan.priceKobo)) {
    console.error("Korapay amount below package price:", { reference, paidNaira, plan: plan.id });
    return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
  }

  // The charge must belong to the signed-in user, so one client can't
  // activate a plan with someone else's payment reference.
  const chargeUserId = data.data?.metadata?.userId as string | undefined;
  if (chargeUserId && chargeUserId !== user.id) {
    return NextResponse.json({ error: "reference_not_yours" }, { status: 403 });
  }

  const result = await activatePaidPackage(createAdminClient(), {
    userId: user.id,
    email: user.email ?? null,
    clientName,
    plan,
    reference,
    amountKobo: Math.round(paidNaira * 100),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({
    ok: true,
    checklistSent: result.checklistSent,
    planId,
    planName: plan.name,
    alreadyRecorded: result.alreadyRecorded,
  });
}
