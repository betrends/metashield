// Sends a case-update email to the SIGNED-IN client's own address.
//
// This used to accept any "to" address and any case title from anyone,
// unauthenticated — an open relay that could send branded MetaShield
// emails to arbitrary people. Server routes now call
// sendCaseUpdateEmail() directly; this endpoint remains only for
// browser tabs still running older app code, and can only email the
// caller themselves.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CASE_EMAIL_KINDS, sendCaseUpdateEmail, type CaseEmailKind } from "@/lib/email/case-update";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: { caseTitle?: unknown; kind?: unknown; stage?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const kind = CASE_EMAIL_KINDS.includes(body.kind as CaseEmailKind)
    ? (body.kind as CaseEmailKind)
    : "case_submitted";

  const { sent } = await sendCaseUpdateEmail({
    to: user.email,
    kind,
    clientName: (user.user_metadata?.full_name as string | undefined) || "there",
    caseTitle: typeof body.caseTitle === "string" ? body.caseTitle.slice(0, 200) : null,
    stage: typeof body.stage === "string" ? body.stage.slice(0, 60) : null,
  });

  return NextResponse.json({ ok: true, sent });
}
