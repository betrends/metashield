// Who a bulk email (Admin → Email users) goes to. Built on the server from
// the database every time; email addresses are never sent to the browser.
//
//  - Registered clients: everyone with a MetaShield account (profiles),
//    except staff (the admin and agents). Optionally only those without an
//    active package.
//  - Form leads: people who ticked "email me" on the account health check
//    or the recovery eligibility check.
//  - Extra emails: addresses the admin pastes in (people who aren't on the
//    platform but know MetaShield).
//
// Everyone who unsubscribed is left out, and each address appears once.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlanId } from "@/lib/portal/billing";

export type ClientAudience = "all" | "no_package" | "none";
export type Audience = { clients: ClientAudience; leads: boolean; extra: string[] };
export type Recipient = { email: string; name: string; kind: "client" | "lead" | "contact" };

const PAGE = 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_EXTRA = 2000;

// Splits pasted text into addresses. Accepts commas, semicolons, spaces or
// one per line, and "Name <email>" style. Returns the good ones (lower-case,
// once each) and the entries that don't look like an email.
export function parseExtraEmails(input: unknown): { valid: string[]; invalid: string[] } {
  const text = Array.isArray(input) ? input.join("\n") : typeof input === "string" ? input : "";
  const valid = new Set<string>();
  const invalid: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const token = raw.replace(/^[<"'(]+|[>"')]+$/g, "").trim().toLowerCase();
    if (!token) continue;
    if (EMAIL_RE.test(token)) valid.add(token);
    else if (token.includes("@")) invalid.push(raw.trim());
    // words without "@" (e.g. a name before <email>) are ignored
  }
  return { valid: [...valid].slice(0, MAX_EXTRA), invalid: invalid.slice(0, 50) };
}

export function parseAudience(input: { clients?: unknown; leads?: unknown; extra?: unknown }): Audience | null {
  const clients = input.clients;
  if (clients !== "all" && clients !== "no_package" && clients !== "none") return null;
  const leads = input.leads === true || input.leads === "1" || input.leads === "true";
  const extra = parseExtraEmails(input.extra).valid;
  if (clients === "none" && !leads && extra.length === 0) return null;
  return { clients, leads, extra };
}

// Reads every row of a query in pages of 1,000 (PostgREST's default cap).
async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(`recipient query failed: ${JSON.stringify(error)}`);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

export async function buildRecipients(admin: SupabaseClient, audience: Audience): Promise<Recipient[]> {
  const norm = (e: unknown) => String(e ?? "").trim().toLowerCase();

  const [agents, unsubs] = await Promise.all([
    readAll<{ email: string | null }>((a, b) => admin.from("agents").select("email").range(a, b)),
    readAll<{ email: string }>((a, b) => admin.from("email_unsubscribes").select("email").range(a, b)),
  ]);
  const staff = new Set([norm(process.env.ADMIN_EMAIL), ...agents.map((x) => norm(x.email))].filter(Boolean));
  const unsubscribed = new Set(unsubs.map((x) => norm(x.email)));

  const byEmail = new Map<string, Recipient>();
  const add = (email: string, name: string, kind: Recipient["kind"]) => {
    if (!EMAIL_RE.test(email) || staff.has(email) || unsubscribed.has(email)) return;
    const existing = byEmail.get(email);
    if (!existing) byEmail.set(email, { email, name, kind });
    else if (kind === "client" && existing.kind !== "client") byEmail.set(email, { email, name: name || existing.name, kind });
  };

  const needPackages = audience.clients === "no_package" || audience.leads || audience.extra.length > 0;
  const [profiles, subs] = await Promise.all([
    readAll<{ id: string; full_name: string | null; email: string | null }>((a, b) =>
      admin.from("profiles").select("id, full_name, email").order("created_at", { ascending: true }).range(a, b)
    ),
    needPackages
      ? readAll<{ user_id: string; plan_id: string; renews_on: string | null }>((a, b) =>
          admin.from("subscriptions").select("user_id, plan_id, renews_on").eq("status", "active").range(a, b)
        )
      : Promise.resolve([]),
  ]);
  const graceStart = Date.now() - 24 * 60 * 60 * 1000; // same rule as activePackageFor
  const withPackage = new Set(
    subs
      .filter((s) => isPlanId(s.plan_id) && (!s.renews_on || new Date(s.renews_on).getTime() >= graceStart))
      .map((s) => s.user_id)
  );
  // Addresses of clients who already have a package (never sent a "get a
  // package" email as a lead).
  const packagedEmails = new Set(profiles.filter((p) => withPackage.has(p.id)).map((p) => norm(p.email)));

  if (audience.clients !== "none") {
    for (const p of profiles) {
      if (audience.clients === "no_package" && withPackage.has(p.id)) continue;
      add(norm(p.email), String(p.full_name ?? "").trim(), "client");
    }
  }

  if (audience.leads) {
    const leads = await readAll<{ name: string | null; email: string | null }>((a, b) =>
      admin
        .from("contact_submissions")
        .select("name, email")
        .in("source", ["recovery_eligibility", "health_check"])
        .eq("email_consent", true)
        .order("created_at", { ascending: true })
        .range(a, b)
    );
    for (const l of leads) {
      const email = norm(l.email);
      if (packagedEmails.has(email)) continue;
      add(email, String(l.name ?? "").trim(), "lead");
    }
  }

  // Extra emails pasted by the admin (clients who already have a package
  // are still left out).
  for (const email of audience.extra) {
    if (packagedEmails.has(email)) continue;
    add(email, "", "contact");
  }

  return [...byEmail.values()];
}

// Resend sends from RESEND_FROM_EMAIL. Its test address (resend.dev) only
// delivers to the Resend account owner, so a real sending domain is needed.
export function senderReady(): { ok: boolean; from: string } {
  const from = process.env.RESEND_FROM_EMAIL || "";
  return { ok: !!process.env.RESEND_API_KEY && !!from && !/resend\.dev/i.test(from), from };
}
