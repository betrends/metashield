// Lists every contact_submissions row — contact form messages, Health
// Check / Recovery Eligibility submissions, and payment-receipt
// notifications — as the admin's support-ticket queue. Gated to
// ADMIN_EMAIL.

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
  const { data, error } = await admin
    .from("contact_submissions")
    .select("id, source, name, email, phone, message, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list support tickets:", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  return NextResponse.json({ tickets: data ?? [] });
}
