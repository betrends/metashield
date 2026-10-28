// The client's phone number for the Call button on the staff Messages
// screen. Same access rule as the conversation itself: the admin for any
// client, an agent only for clients on their own cases. Looks in the
// places a client may have given a number, most direct first.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { canAccessCase, canAccessClient, getAdminRole } from "@/lib/admin/auth";

const clean = (v: unknown) => (typeof v === "string" && v.replace(/\D/g, "").length >= 7 ? v.trim() : null);

export async function GET(request: Request) {
  const role = await getAdminRole();
  if (!role) return NextResponse.json({ error: "not_authorized" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const caseId = searchParams.get("caseId");
  if (!userId) return NextResponse.json({ error: "missing_user_id" }, { status: 400 });

  const allowed = caseId ? await canAccessCase(role, caseId) : await canAccessClient(role, userId);
  if (!allowed) return NextResponse.json({ error: "not_authorized" }, { status: 403 });

  const admin = createAdminClient();
  if (caseId) {
    // The case must belong to this client (no mixing threads).
    const { data: c } = await admin.from("cases").select("user_id").eq("id", caseId).maybeSingle();
    if (!c || c.user_id !== userId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [{ data: profile }, { data: userData }] = await Promise.all([
    admin.from("profiles").select("phone").eq("id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ]);
  const user = userData?.user;

  let phone = clean(profile?.phone) ?? clean(user?.user_metadata?.phone);
  let source = phone ? "Client's profile" : null;

  if (!phone && user?.email) {
    const { data: lead } = await admin
      .from("contact_submissions")
      .select("phone, created_at")
      .ilike("email", user.email)
      .not("phone", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    phone = clean(lead?.phone);
    if (phone) source = "Given on the eligibility check";
  }

  if (!phone) {
    let form = admin.from("recovery_form_submissions").select("answers, submitted_at").eq("user_id", userId);
    if (caseId) form = form.eq("case_id", caseId);
    const { data: forms } = await form.order("submitted_at", { ascending: false }).limit(1);
    const answers = (forms?.[0]?.answers ?? {}) as Record<string, unknown>;
    phone = clean(answers.instagram_phone);
    if (phone) source = "Phone on the client's account (recovery form)";
  }

  return NextResponse.json({ phone, source });
}
