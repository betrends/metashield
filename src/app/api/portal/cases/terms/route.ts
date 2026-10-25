// Records that the signed-in client accepted the current recovery terms
// for one of their cases (timestamp, terms version, client, case). The
// deposit receipt route refuses payment until this exists.

import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { TERMS_VERSION } from "@/lib/portal/recovery-terms";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let body: { caseId?: unknown; version?: unknown; accepted?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  if (!caseId || body.accepted !== true) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  if (body.version !== TERMS_VERSION) {
    // The page showed an older text; make the client re-read the current one.
    return NextResponse.json({ error: "terms_changed", version: TERMS_VERSION }, { status: 409 });
  }

  const { data: ownCase } = await supabase.from("cases").select("id").eq("id", caseId).maybeSingle();
  if (!ownCase) return NextResponse.json({ error: "case_not_found" }, { status: 404 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("case_terms_acceptances")
    .upsert(
      { case_id: caseId, user_id: user.id, terms_version: TERMS_VERSION },
      { onConflict: "case_id,terms_version", ignoreDuplicates: true }
    )
    .select("accepted_at")
    .maybeSingle();
  if (error) {
    console.error("Terms acceptance failed:", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  if (data) {
    await admin.from("case_timeline_events").insert({ case_id: caseId, event: `Recovery terms accepted (version ${TERMS_VERSION})` });
  }
  return NextResponse.json({ ok: true, version: TERMS_VERSION });
}
