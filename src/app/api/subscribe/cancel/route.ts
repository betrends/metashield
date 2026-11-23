import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";
import { stopAutoRenew } from "@/lib/server/paystack-autopay";

export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Stop automatic card payments first, so a cancelled package is never
  // charged again.
  if (!(await stopAutoRenew(admin, user.id))) {
    return NextResponse.json({ error: "autopay_stop_failed" }, { status: 502 });
  }

  const { error } = await admin
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .in("status", ["active", "trial"]); // a free trial can be stopped too

  if (error) {
    console.error("Failed to cancel subscription:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
