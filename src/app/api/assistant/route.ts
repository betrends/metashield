// Server-side endpoint for the real AI Assistant. Keeps ANTHROPIC_API_KEY
// off the client entirely — the browser only ever talks to this route.
//
// Falls back gracefully: if ANTHROPIC_API_KEY isn't set yet, this returns
// a 503 with a clear reason, and the assistant page falls back to the
// rule-based responder (lib/portal/ai-assistant.ts) so the demo keeps
// working before a real key is configured.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { PortalAccount } from "@/lib/portal/data";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are the MetaShield AI Assistant, embedded in the MetaShield client portal. MetaShield helps businesses and creators recover, protect and monitor their social/business accounts (Instagram, Facebook, Meta Business, Meta Ads, TikTok, Google Ads).

You'll be given the signed-in client's current accounts (handle, platform, health score out of 100, risk level, protection status, and a category breakdown when available). Ground every answer in that real data — reference specific accounts, scores and risk levels by name rather than speaking generically.

Rules:
- Never invent a statistic, success rate, or "chance of recovery" percentage that isn't in the data you were given — if asked for one, explain that a real assessment requires the team's review instead of guessing a number.
- Never ask the user for their social media (Instagram/Facebook/etc.) password, or any password. MetaShield never needs it.
- If an account is unprotected and at meaningful risk, mention that an Account Protection subscription (in the portal's Billing page) adds ongoing monitoring — but don't be pushy about it.
- If something needs a human (a live case, a dispute, anything you're not confident about), say so plainly and point them to Contact Support or Messages rather than guessing.
- Keep replies short and conversational — a few sentences, occasionally a short bullet list. This is a chat widget, not a report.`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "not_configured", message: "ANTHROPIC_API_KEY isn't set." },
      { status: 503 }
    );
  }

  let body: { message?: unknown; accounts?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }
  // Cap length defensively — this is a free-text field reaching a paid API.
  if (message.length > 2000) {
    return NextResponse.json({ error: "message_too_long" }, { status: 400 });
  }

  const accounts = Array.isArray(body.accounts) ? (body.accounts as PortalAccount[]) : [];

  const accountsSummary =
    accounts.length > 0
      ? accounts
          .map((a) => {
            const cats = a.categories?.length
              ? ` Categories: ${a.categories.map((c) => `${c.label}=${c.level}`).join(", ")}.`
              : "";
            return `- ${a.handle} (${a.platform}): health ${a.health}/100, risk ${a.level}, protection ${
              a.protectionActive ? "active" : "not enrolled"
            }.${cats}`;
          })
          .join("\n")
      : "This client has no accounts on file yet.";

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "low" },
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: `Client's current accounts:\n${accountsSummary}` },
      ],
      messages: [{ role: "user", content: message }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const reply = textBlock?.type === "text" ? textBlock.text : "";

    if (!reply) {
      return NextResponse.json({ error: "empty_response" }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "auth_error", message: "Invalid Anthropic API key." },
        { status: 503 }
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "rate_limited", message: "Too many requests — try again shortly." },
        { status: 429 }
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: "api_error", message: error.message },
        { status: error.status ?? 502 }
      );
    }
    return NextResponse.json({ error: "unknown_error" }, { status: 500 });
  }
}
