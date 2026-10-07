// Moves a case to a new stage on the admin's behalf (the client-side
// updateCaseStage in lib/portal/data.ts only works for the case's own
// owner via RLS — this is the admin-on-anyone's-case equivalent). Every
// stage change logs a timeline event, a message from the agent, and
// emails the client — recovery should never advance silently.

import { NextResponse } from "next/server";
import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";

const VALID_STAGES = [
  "New Lead",
  "Assessment Pending",
  "Payment Pending",
  "Documents Required",
  "Under Review",
  "Recovery Process",
  "Awaiting Platform Response",
  "Resolved",
];

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminUser || !adminEmail || adminUser.email !== adminEmail) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  let body: { caseId?: unknown; stage?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const stage = typeof body.stage === "string" ? body.stage : "";
  if (!caseId || !VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: updatedCase, error } = await admin
    .from("cases")
    .update({ stage })
    .eq("id", caseId)
    .select("id, title, user_id, agent_name")
    .single();

  if (error || !updatedCase) {
    console.error("Failed to advance case stage:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  await admin.from("case_timeline_events").insert({
    case_id: caseId,
    event: `Moved to ${stage}`,
  });

  const isResolved = stage === "Resolved";
  await admin.from("messages").insert({
    user_id: updatedCase.user_id,
    case_id: caseId,
    from_role: "team",
    author_name: updatedCase.agent_name || "Your agent",
    body: isResolved
      ? "Great news — your case is resolved! Reach out any time if you need anything else."
      : `Update: your case has moved to "${stage}". I'll keep you posted as it progresses.`,
  });

  const { data: clientData } = await admin.auth.admin.getUserById(updatedCase.user_id);
  const clientEmail = clientData?.user?.email;
  if (clientEmail) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    fetch(`${appUrl}/api/case-update-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: clientEmail,
        clientName: (clientData?.user?.user_metadata?.full_name as string | undefined) || "there",
        caseTitle: updatedCase.title,
        kind: "stage_changed",
        stage,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
