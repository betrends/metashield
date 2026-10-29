// The admin switches a package on (or off) for a client — used while card
// payment is off and clients pay over WhatsApp/bank transfer. Admin only.
//
// POST { userId, planId, note? }  → package active from today (or extended
//                                     from the current end date when the
//                                     same package is renewed early)
// POST { userId, action: "end" }  → package switched off
//
// Every activation records the payment (invoices) so revenue figures stay
// right, and sends the client the welcome email.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminRole } from "@/lib/admin/auth";
import { getPlan, isPlanId, planEndsOn } from "@/lib/portal/billing";
import { subscriptionWelcomeEmail } from "@/lib/email-templates";

export async function POST(request: Request) {
  const role = await getAdminRole();
  if (!role || role.type !== "admin") return NextResponse.json({ error: "not_authorized" }, { status: 403 });

  let body: { userId?: unknown; planId?: unknown; note?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) return NextResponse.json({ error: "missing_user" }, { status: 400 });

  const admin = createAdminClient();
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const client = userData?.user;
  if (!client) return NextResponse.json({ error: "client_not_found" }, { status: 404 });

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, plan_id, status, renews_on")
    .eq("user_id", userId)
    .maybeSingle();

  if (body.action === "end") {
    if (!existing || existing.status !== "active") return NextResponse.json({ ok: true, alreadyEnded: true });
    const { error } = await admin
      .from("subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) {
      console.error("Failed to end package:", error);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, ended: true });
  }

  if (!isPlanId(body.planId)) return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  const plan = getPlan(body.planId);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : "";

  // Renewing the same package early adds the new period on top of what's left.
  const now = new Date();
  const currentEnd = existing?.renews_on ? new Date(existing.renews_on) : null;
  const extendFrom =
    existing?.status === "active" && existing.plan_id === plan.id && currentEnd && currentEnd > now ? currentEnd : now;
  const renewsOn = planEndsOn(plan, extendFrom);

  let subscriptionId: string;
  if (existing) {
    const { error } = await admin
      .from("subscriptions")
      .update({ plan_id: plan.id, status: "active", renews_on: renewsOn, updated_at: now.toISOString() })
      .eq("id", existing.id);
    if (error) {
      console.error("Failed to activate package:", error);
      return NextResponse.json({ error: "db_error", message: error.message }, { status: 500 });
    }
    subscriptionId = existing.id;
  } else {
    const { data: inserted, error } = await admin
      .from("subscriptions")
      .insert({ user_id: userId, plan_id: plan.id, status: "active", renews_on: renewsOn })
      .select("id")
      .single();
    if (error || !inserted) {
      console.error("Failed to create package:", error);
      return NextResponse.json({ error: "db_error", message: error?.message }, { status: 500 });
    }
    subscriptionId = inserted.id;
  }

  const { error: invoiceError } = await admin.from("invoices").insert({
    user_id: userId,
    subscription_id: subscriptionId,
    amount_kobo: plan.priceKobo,
    currency: "NGN",
    status: "paid",
    recorded_by: role.email,
    note: note || "Activated by admin (paid outside card checkout)",
  });
  if (invoiceError) console.error("Package active but payment record failed:", invoiceError);

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && client.email) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "MetaShield <onboarding@resend.dev>",
        to: client.email,
        subject: `Welcome to ${plan.name}`,
        html: subscriptionWelcomeEmail({
          clientName: (client.user_metadata?.full_name as string | undefined) || "there",
          planName: plan.name,
          planPrice: plan.price,
          priceSuffix: plan.priceSuffix ?? "",
          features: plan.features,
          renewsOn,
        }),
      });
    } catch (err) {
      console.error("Package welcome email failed:", err);
    }
  }

  return NextResponse.json({ ok: true, planId: plan.id, planName: plan.name, renewsOn, paymentRecorded: !invoiceError });
}
