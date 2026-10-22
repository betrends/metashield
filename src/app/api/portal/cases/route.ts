// Creates a recovery case for the signed-in client. This used to happen
// in the browser, which let a client choose their own fee, stage,
// payment status and agent, and post the "welcome" message as the team.
// Now the server decides all of those:
//   - fee from the follower-range price list (lib/portal/case-fees.ts)
//   - stage "Payment Pending", payment "unpaid"
//   - a real active agent from the roster, or no agent (shows as
//     "Unassigned" for the admin) — never a placeholder name without an
//     id, which made cases invisible to every agent.

import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { formatNaira, getFollowerRangeFeeKobo, FOLLOWER_RANGES } from "@/lib/portal/case-fees";
import { sendCaseUpdateEmail } from "@/lib/email/case-update";

const MAX = { title: 120, platform: 60, handle: 120, issue: 2000, event: 200, events: 5 };

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Only accept screenshot links to our own public screenshots bucket.
function safeScreenshotUrl(value: unknown): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (typeof value !== "string" || !base) return null;
  const prefix = `${base.replace(/\/$/, "")}/storage/v1/object/public/screenshots/`;
  return value.startsWith(prefix) && value.length < 500 ? value : null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const title = str(body.title, MAX.title);
  const platform = str(body.platform, MAX.platform);
  const accountHandle = str(body.accountHandle, MAX.handle) || platform;
  const issue = str(body.issue, MAX.issue);
  if (!title || !platform) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const followerRange = FOLLOWER_RANGES.some((r) => r.value === body.followerRange)
    ? (body.followerRange as string)
    : "0-500";
  const feeKobo = getFollowerRangeFeeKobo(followerRange);
  const clientEvents = (Array.isArray(body.timeline) ? body.timeline : [])
    .map((t) => str((t as { event?: unknown })?.event, MAX.event))
    .filter(Boolean)
    .slice(0, MAX.events);

  const admin = createAdminClient();

  const { data: roster } = await admin.from("agents").select("id, name, phone, email").eq("active", true);
  const agent = roster && roster.length > 0 ? roster[Math.floor(Math.random() * roster.length)] : null;

  const { data: created, error } = await admin
    .from("cases")
    .insert({
      user_id: user.id,
      title,
      platform,
      account_handle: accountHandle,
      stage: "Payment Pending",
      agent_id: agent?.id ?? null,
      agent_name: agent?.name ?? null,
      agent_phone: agent?.phone ?? null,
      agent_email: agent?.email ?? null,
      issue: issue || null,
      fee_amount_kobo: feeKobo,
      payment_status: "unpaid",
      screenshot_url: safeScreenshotUrl(body.screenshotUrl),
    })
    .select("id, title")
    .single();
  if (error || !created) {
    console.error("Failed to create case:", error);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  const events = [
    ...clientEvents,
    agent ? `Assigned to ${agent.name}` : "Awaiting agent assignment",
    `Payment of ${formatNaira(feeKobo)} required to begin recovery`,
  ];
  const { error: timelineError } = await admin
    .from("case_timeline_events")
    .insert(events.map((event) => ({ case_id: created.id, event })));
  if (timelineError) console.error("Case created but timeline insert failed:", timelineError);

  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there";
  const authorName = agent?.name ?? "MetaShield Team";
  const { error: messageError } = await admin.from("messages").insert({
    user_id: user.id,
    case_id: created.id,
    from_role: "team",
    author_name: authorName,
    body: agent
      ? `Hi ${firstName}, I'm ${agent.name} and I'll be handling your case (${title}). Once the case fee of ${formatNaira(
          feeKobo
        )} is paid, I'll start the recovery process right away — you can pay from this case's page any time${
          agent.phone ? `, and reach me directly at ${agent.phone}` : ""
        }.`
      : `Hi ${firstName}, thanks for opening your case (${title}). An agent will be assigned shortly. Once the case fee of ${formatNaira(
          feeKobo
        )} is paid, recovery starts right away — you can pay from this case's page any time.`,
  });
  if (messageError) console.error("Case created but welcome message failed:", messageError);

  if (user.email) {
    await sendCaseUpdateEmail({
      to: user.email,
      kind: "case_submitted",
      clientName: (user.user_metadata?.full_name as string | undefined) || "there",
      caseTitle: title,
      agentName: agent?.name ?? null,
      agentPhone: agent?.phone ?? null,
    });
  }

  return NextResponse.json({ id: created.id });
}
