// Lists every signed-up client with their contact details and a quick
// activity summary. Gated to ADMIN_EMAIL, same as the payments routes.

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

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, full_name, email, phone, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list clients:", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const clients = await Promise.all(
    (profiles ?? []).map(async (profile) => {
      const [{ count: accountCount }, { count: caseCount }, { count: unpaidCount }] = await Promise.all([
        admin.from("accounts").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
        admin.from("cases").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
        admin
          .from("cases")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.id)
          .in("payment_status", ["unpaid", "pending_review"]),
      ]);
      return {
        id: profile.id,
        name: profile.full_name || null,
        email: profile.email,
        phone: profile.phone || null,
        joinedAt: profile.created_at,
        accountCount: accountCount ?? 0,
        caseCount: caseCount ?? 0,
        unpaidCaseCount: unpaidCount ?? 0,
      };
    })
  );

  return NextResponse.json({ clients });
}
