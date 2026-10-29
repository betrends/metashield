// Creates a recovery case for the signed-in client. This used to happen
// in the browser, which let a client choose their own fee, stage,
// payment status and agent, and post the "welcome" message as the team.
// Now the server decides all of those:
//   - fee from the follower-range price list (lib/portal/case-fees.ts),
//     and the 50% deposit due before recovery starts (lib/portal/payments.ts)
//   - stage "Payment Pending", payment "unpaid"
//   - a real active agent from the roster, or no agent (shows as
//     "Unassigned" for the admin) — never a placeholder name without an
//     id, which made cases invisible to every agent.
//   - a client whose active MetaShield package covers this platform pays
//     nothing: no fee, no deposit, and the case goes straight to the
//     recovery form (lib/server/packages.ts).

import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { formatNaira, getFollowerRangeFeeKobo, FOLLOWER_RANGES } from "@/lib/portal/case-fees";
import { sendCaseUpdateEmail } from "@/lib/email/case-update";
import { depositFor } from "@/lib/portal/payments";
import { postCaseMessage } from "@/lib/server/case-events";
import { coveringPackage } from "@/lib/server/packages";
import { COVERED_FORM_REQUEST_MESSAGE, RECOVERY_FORM_VERSION } from "@/lib/portal/recovery-form";

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
  // The wizard requires ticking the Terms (incl. payment, deposit and
  // refund policy) before submitting; record that acceptance here.
  if (body.termsAccepted !== true) {
    return NextResponse.json({ error: "terms_not_accepted" }, { status: 400 });
  }
  const followerRange = FOLLOWER_RANGES.some((r) => r.value === body.followerRange)
    ? (body.followerRange as string)
    : "0-500";
  const admin = createAdminClient();
  const covered = await coveringPackage(admin, user.id, platform);
  const feeKobo = covered ? 0 : getFollowerRangeFeeKobo(followerRange);
  const depositKobo = covered ? 0 : depositFor(feeKobo);
  const startStage = covered ? "Documents Required" : "Payment Pending";
  const clientEvents = (Array.isArray(body.timeline) ? body.timeline : [])
    .map((t) => str((t as { event?: unknown })?.event, MAX.event))
    .filter(Boolean)
    .slice(0, MAX.events);

  const { data: roster } = await admin.from("agents").select("id, name, phone, email").eq("active", true);
  const agent = roster && roster.length > 0 ? roster[Math.floor(Math.random() * roster.length)] : null;

  const { data: created, error } = await admin
    .from("cases")
    .insert({
      user_id: user.id,
      title,
      platform,
      account_handle: accountHandle,
      stage: startStage,
      agent_id: agent?.id ?? null,
      agent_name: agent?.name ?? null,
      agent_phone: agent?.phone ?? null,
      agent_email: agent?.email ?? null,
      issue: issue || null,
      fee_amount_kobo: feeKobo,
      deposit_amount_kobo: depositKobo,
      payment_status: covered ? "paid" : "unpaid",
      ...(covered ? { deposit_paid_at: new Date().toISOString() } : {}),
      terms_accepted_at: new Date().toISOString(),
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
    covered
      ? `Covered by ${covered.plan.name} — no recovery fee`
      : `Deposit of ${formatNaira(depositKobo)} (50% of ${formatNaira(feeKobo)}) required to begin recovery`,
  ];
  const { error: historyError } = await admin.from("case_stage_history").insert({
    case_id: created.id,
    from_stage: null,
    to_stage: startStage,
    actor_role: "client",
    actor: user.email ?? null,
    reason: covered ? `Case opened — covered by ${covered.plan.name}` : "Case opened",
  });
  if (historyError) console.error("Case created but stage history insert failed:", historyError);

  const { error: timelineError } = await admin
    .from("case_timeline_events")
    .insert(events.map((event) => ({ case_id: created.id, event })));
  if (timelineError) console.error("Case created but timeline insert failed:", timelineError);

  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there";
  const authorName = agent?.name ?? "MetaShield Team";
  await postCaseMessage(admin, {
    userId: user.id,
    caseId: created.id,
    authorName,
    kind: "message",
    dedupeKey: `welcome:${created.id}`,
    body: covered
      ? `Hi ${firstName}, ${agent ? `I'm ${agent.name} and I'll be handling` : "thanks for opening"} your case (${title}). Your ${
          covered.plan.name
        } package covers this recovery, so there's no recovery fee and no deposit to pay${
          agent?.phone ? `. You can reach me directly at ${agent.phone}` : ""
        }.`
      : agent
      ? `Hi ${firstName}, I'm ${agent.name} and I'll be handling your case (${title}). The total recovery fee is ${formatNaira(
          feeKobo
        )}. Once the 50% deposit of ${formatNaira(
          depositKobo
        )} is confirmed, I'll start the recovery process right away — you can pay from this case's page any time${
          agent.phone ? `, and reach me directly at ${agent.phone}` : ""
        }.`
      : `Hi ${firstName}, thanks for opening your case (${title}). An agent will be assigned shortly. The total recovery fee is ${formatNaira(
          feeKobo
        )}; once the 50% deposit of ${formatNaira(
          depositKobo
        )} is confirmed, recovery starts right away — you can pay from this case's page any time.`,
  });

  // Covered: nothing to pay, so the recovery form comes straight away (the
  // same message a confirmed deposit sends, under the same once-only key).
  if (covered) {
    await postCaseMessage(admin, {
      userId: user.id,
      caseId: created.id,
      authorName,
      kind: "form_request",
      dedupeKey: `deposit_confirmed:${created.id}`,
      metadata: { formVersion: RECOVERY_FORM_VERSION, coveredBy: covered.plan.id },
      body: COVERED_FORM_REQUEST_MESSAGE,
    });
  }


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

  return NextResponse.json({ id: created.id, coveredBy: covered ? covered.plan.name : null });
}
