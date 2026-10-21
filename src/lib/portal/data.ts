"use client";

// Real data-access layer for the client portal. Reads/writes the
// Supabase tables in supabase/schema.sql, replacing the old mock arrays
// and localStorage demo data (lib/portal/mock-data.ts's arrays and
// lib/portal/local-records.ts, which still exist only to hand off a
// wizard result to migratePendingLocalRecords() right after sign-up).

import type { RiskLevel } from "@/components/ui/RiskBadge";
import type { CaseStage } from "@/lib/portal/mock-data";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  clearLocalAccount,
  clearLocalCase,
  getLocalAccount,
  getLocalCase,
} from "@/lib/portal/local-records";
import { pickAgent } from "@/lib/portal/agents";
import { getFollowerRangeFeeKobo, formatNaira, type FollowerRange } from "@/lib/portal/case-fees";
import { pickDefaultCaseId, safeStorageName } from "@/lib/portal/case-rules";

export type PortalAccount = {
  id: string;
  handle: string;
  platform: string;
  health: number;
  level: RiskLevel;
  protectionActive: boolean;
  categories?: { label: string; level: RiskLevel }[];
  createdAt: string;
};

export type PortalCase = {
  id: string;
  title: string;
  platform: string;
  accountHandle: string;
  stage: CaseStage;
  timeline: { date: string; event: string }[];
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  issue?: string;
  feeAmountKobo?: number;
  paymentStatus: "unpaid" | "pending_review" | "paid" | "failed";
  receiptStoragePath?: string;
};

export type PortalMessage = {
  id: string;
  from: "client" | "team";
  authorName: string;
  body: string;
  date: string;
  caseId?: string;
  attachment?: string;
  attachmentPath?: string;
};

export type PortalDocument = {
  id: string;
  name: string;
  category: string;
  uploadedDate: string;
  sizeLabel: string;
  storagePath: string | null;
  caseId: string | null;
};

// PostgREST error for a column that doesn't exist yet — i.e. migration
// 010_phase1_case_links.sql hasn't been run. Writes retry without the new
// column so uploads and messages keep working in the meantime.
function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST204" || error.code === "42703" || /column .* does not exist|schema cache/i.test(error.message ?? "");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function requireUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in.");
  return user;
}

// Picks a random active agent from the real roster the admin manages at
// /admin/agents. Falls back to the hardcoded placeholder list only if
// that table is empty or unreachable (e.g. migration not run yet), so a
// case never fails to get an agent.
async function pickRealAgent(
  supabase: SupabaseClient
): Promise<{ id: string | null; name: string; phone: string; email: string }> {
  const { data } = await supabase.from("agents").select("id, name, phone, email").eq("active", true);
  if (data && data.length > 0) {
    const row = data[Math.floor(Math.random() * data.length)];
    return { id: row.id, name: row.name, phone: row.phone ?? "", email: row.email };
  }
  const fallback = pickAgent();
  return { id: null, ...fallback };
}

// ── Accounts ──────────────────────────────────────────────────────────

type AccountRow = {
  id: string;
  handle: string;
  platform: string;
  health: number;
  level: RiskLevel;
  protection_active: boolean;
  categories: { label: string; level: RiskLevel }[] | null;
  created_at: string;
};

function mapAccount(row: AccountRow): PortalAccount {
  return {
    id: row.id,
    handle: row.handle,
    platform: row.platform,
    health: row.health,
    level: row.level,
    protectionActive: row.protection_active,
    categories: row.categories ?? undefined,
    createdAt: row.created_at,
  };
}

export async function fetchAccounts(): Promise<PortalAccount[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as AccountRow[]).map(mapAccount);
}

export async function fetchAccount(id: string): Promise<PortalAccount | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("accounts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapAccount(data as AccountRow) : null;
}

// Used both by the signed-in-already path (an in-portal wizard run) and
// by migratePendingLocalRecords (a wizard result carried over from before
// sign-up).
export async function createAccount(input: {
  handle: string;
  platform: string;
  health: number;
  level: RiskLevel;
  protectionActive: boolean;
  categories?: { label: string; level: RiskLevel }[];
}): Promise<PortalAccount> {
  const supabase = createClient();
  const user = await requireUser(supabase);
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      handle: input.handle,
      platform: input.platform,
      health: input.health,
      level: input.level,
      protection_active: input.protectionActive,
      categories: input.categories ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapAccount(data as AccountRow);
}

// ── Cases ─────────────────────────────────────────────────────────────

type CaseRow = {
  id: string;
  title: string;
  platform: string;
  account_handle: string;
  stage: CaseStage;
  agent_name: string | null;
  agent_phone: string | null;
  agent_email: string | null;
  issue: string | null;
  fee_amount_kobo: number | null;
  payment_status: "unpaid" | "pending_review" | "paid" | "failed";
  receipt_storage_path: string | null;
};

type TimelineRow = { event: string; created_at: string };

function mapCase(row: CaseRow, timeline: PortalCase["timeline"]): PortalCase {
  return {
    id: row.id,
    title: row.title,
    platform: row.platform,
    accountHandle: row.account_handle,
    stage: row.stage,
    timeline,
    agentName: row.agent_name ?? undefined,
    agentPhone: row.agent_phone ?? undefined,
    agentEmail: row.agent_email ?? undefined,
    issue: row.issue ?? undefined,
    feeAmountKobo: row.fee_amount_kobo ?? undefined,
    paymentStatus: row.payment_status,
    receiptStoragePath: row.receipt_storage_path ?? undefined,
  };
}

export async function fetchCases(): Promise<PortalCase[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = data as CaseRow[];
  return Promise.all(
    rows.map(async (row) => mapCase(row, await fetchCaseTimeline(supabase, row.id)))
  );
}

export async function fetchCase(id: string): Promise<PortalCase | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as CaseRow;
  return mapCase(row, await fetchCaseTimeline(supabase, row.id));
}

export async function createCase(input: {
  title: string;
  platform: string;
  accountHandle: string;
  issue: string;
  followerRange?: FollowerRange;
  timeline?: { event: string }[];
  screenshotUrl?: string | null;
}): Promise<PortalCase> {
  const supabase = createClient();
  const user = await requireUser(supabase);
  const agent = await pickRealAgent(supabase);
  const feeKobo = input.followerRange ? getFollowerRangeFeeKobo(input.followerRange) : 100_000_00; // default to 0-500 if not specified

  // Every new case starts here — an agent is assigned immediately, and
  // recovery work begins once the client pays the case fee.
  const { data: insertedCase, error } = await supabase
    .from("cases")
    .insert({
      user_id: user.id,
      title: input.title,
      platform: input.platform,
      account_handle: input.accountHandle,
      stage: "Payment Pending",
      agent_id: agent.id,
      agent_name: agent.name,
      agent_phone: agent.phone,
      agent_email: agent.email,
      issue: input.issue,
      fee_amount_kobo: feeKobo,
      payment_status: "unpaid",
      screenshot_url: input.screenshotUrl ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  const row = insertedCase as CaseRow;

  const timelineEvents = [
    ...(input.timeline ?? []),
    { event: `Assigned to ${agent.name}` },
    { event: `Payment of ${formatNaira(feeKobo)} required to begin recovery` },
  ];
  await supabase
    .from("case_timeline_events")
    .insert(timelineEvents.map((t) => ({ case_id: row.id, event: t.event })));

  // A welcome message from the assigned agent, so the case doesn't open
  // to an empty inbox — matches the "your agent talks to you on
  // messages" experience, and gives them the agent's name right away.
  await supabase.from("messages").insert({
    user_id: user.id,
    case_id: row.id,
    from_role: "team",
    author_name: agent.name,
    body: `Hi ${
      (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there"
    }, I'm ${agent.name} and I'll be handling your case (${input.title}). Once the case fee of ${formatNaira(
      feeKobo
    )} is paid, I'll start the recovery process right away — you can pay from this case's page any time, and reach me directly at ${agent.phone}.`,
  });

  // Let the client know by email too. Fire-and-forget — the case is
  // already saved regardless of whether this succeeds, and it silently
  // no-ops if RESEND_API_KEY isn't configured yet.
  if (user.email) {
    fetch("/api/case-update-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: user.email,
        clientName: (user.user_metadata?.full_name as string | undefined) || "there",
        caseTitle: input.title,
        kind: "case_submitted",
        agentName: agent.name,
        agentPhone: agent.phone,
      }),
    }).catch(() => {});
  }

  return mapCase(row, await fetchCaseTimeline(supabase, row.id));
}

export async function updateCaseStage(caseId: string, stage: CaseStage): Promise<void> {
  const supabase = createClient();
  const user = await requireUser(supabase);

  const { data: updatedCase, error } = await supabase
    .from("cases")
    .update({ stage })
    .eq("id", caseId)
    .select()
    .single();
  if (error) throw error;
  const row = updatedCase as CaseRow;

  await supabase.from("case_timeline_events").insert({ case_id: caseId, event: `Moved to ${stage}` });

  if (user.email) {
    fetch("/api/case-update-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: user.email,
        clientName: (user.user_metadata?.full_name as string | undefined) || "there",
        caseTitle: row.title,
        kind: "stage_changed",
        stage,
      }),
    }).catch(() => {});
  }
}

// Bank-transfer flow: the client uploads proof of payment, which puts the
// case into "pending_review" until the admin confirms it (see
// /admin/payments). Reuses the same "documents" Storage bucket as
// the Document Center, under a receipts/ sub-path.
export async function submitPaymentReceipt(caseId: string, file: File): Promise<PortalCase> {
  const supabase = createClient();
  const user = await requireUser(supabase);

  const path = `${user.id}/receipts/${caseId}-${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
  if (uploadError) throw uploadError;

  const { data: updatedCase, error } = await supabase
    .from("cases")
    .update({ payment_status: "pending_review", receipt_storage_path: path })
    .eq("id", caseId)
    .select()
    .single();
  if (error) throw error;
  const row = updatedCase as CaseRow;

  await supabase.from("case_timeline_events").insert({
    case_id: caseId,
    event: "Payment receipt submitted — awaiting confirmation",
  });

  // Let the team know a receipt needs review. Fire-and-forget — the
  // receipt itself is already saved regardless of whether this succeeds.
  fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "payment_receipt",
      name: (user.user_metadata?.full_name as string | undefined) || "A client",
      email: user.email || "unknown",
      message: `Receipt submitted for case "${row.title}" (${caseId}). Review it at /admin/payments.`,
      metadata: { caseId, caseTitle: row.title, feeAmountKobo: String(row.fee_amount_kobo ?? "") },
    }),
  }).catch(() => {});

  // Let the client know their receipt arrived too — every step of
  // recovery gets its own email, not just submission and confirmation.
  if (user.email) {
    fetch("/api/case-update-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: user.email,
        clientName: (user.user_metadata?.full_name as string | undefined) || "there",
        caseTitle: row.title,
        kind: "receipt_received",
      }),
    }).catch(() => {});
  }

  return mapCase(row, await fetchCaseTimeline(supabase, row.id));
}

async function fetchCaseTimeline(supabase: SupabaseClient, caseId: string) {
  const { data, error } = await supabase
    .from("case_timeline_events")
    .select("event, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as TimelineRow[]).map((row) => ({
    date: formatDate(row.created_at),
    event: row.event,
  }));
}

// ── Messages ──────────────────────────────────────────────────────────

type MessageRow = {
  id: string;
  from_role: "client" | "team";
  author_name: string;
  body: string;
  attachment_name: string | null;
  attachment_path?: string | null;
  case_id: string | null;
  created_at: string;
};

function mapMessage(row: MessageRow): PortalMessage {
  return {
    id: row.id,
    from: row.from_role,
    authorName: row.author_name,
    body: row.body,
    date: formatDateTime(row.created_at),
    caseId: row.case_id ?? undefined,
    attachment: row.attachment_name ?? undefined,
    attachmentPath: row.attachment_path ?? undefined,
  };
}

// Messages and documents sent without an explicit case go to the client's
// newest open case, so they land in the same thread/case the assigned
// agent is looking at instead of an unlinked "General" bucket that agents
// can't see.
async function defaultCaseId(supabase: SupabaseClient, preferStage?: CaseStage): Promise<string | null> {
  const { data } = await supabase
    .from("cases")
    .select("id, stage")
    .order("created_at", { ascending: false });
  return pickDefaultCaseId((data ?? []) as { id: string; stage: CaseStage }[], preferStage);
}

// Short-lived link to a file in the "documents" bucket. Storage policies
// only let a client sign files inside their own "<user-id>/…" folder.
export async function getFileUrl(storagePath: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(storagePath, 60 * 10);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function fetchMessages(): Promise<PortalMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as MessageRow[]).map(mapMessage);
}

export async function sendMessage(input: {
  body: string;
  caseId?: string | null;
  attachmentName?: string | null;
  attachmentFile?: File | null;
}): Promise<PortalMessage> {
  const supabase = createClient();
  const user = await requireUser(supabase);
  const caseId = input.caseId ?? (await defaultCaseId(supabase));

  // Upload the attachment itself — previously only its file name was
  // saved, so agents and the admin had nothing to open.
  let attachmentPath: string | null = null;
  const attachmentName = input.attachmentFile?.name ?? input.attachmentName ?? null;
  if (input.attachmentFile) {
    attachmentPath = `${user.id}/attachments/${Date.now()}-${safeStorageName(input.attachmentFile.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(attachmentPath, input.attachmentFile);
    if (uploadError) throw uploadError;
  }

  const row = {
    user_id: user.id,
    case_id: caseId,
    from_role: "client",
    author_name: (user.user_metadata?.full_name as string | undefined) || "You",
    body: input.body,
    attachment_name: attachmentName,
    attachment_path: attachmentPath,
  };
  let { data, error } = await supabase.from("messages").insert(row).select().single();
  if (isMissingColumnError(error)) {
    const { attachment_path: _omit, ...legacyRow } = row;
    void _omit;
    ({ data, error } = await supabase.from("messages").insert(legacyRow).select().single());
  }
  if (error) throw error;
  return mapMessage(data as MessageRow);
}

// ── Documents ─────────────────────────────────────────────────────────

type DocumentRow = {
  id: string;
  name: string;
  category: string;
  size_bytes: number | null;
  storage_path: string | null;
  case_id?: string | null;
  created_at: string;
};

function mapDocument(row: DocumentRow): PortalDocument {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    uploadedDate: formatDate(row.created_at),
    sizeLabel: formatSize(row.size_bytes),
    storagePath: row.storage_path,
    caseId: row.case_id ?? null,
  };
}

export async function fetchDocuments(): Promise<PortalDocument[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DocumentRow[]).map(mapDocument);
}

// Which case a Document Center upload belongs to when the page didn't
// pass one: the client's case waiting on documents, else their newest
// open case.
export async function resolveDocumentCaseId(caseId?: string | null): Promise<string | null> {
  if (caseId) return caseId;
  return defaultCaseId(createClient(), "Documents Required");
}

export async function uploadDocument(
  file: File,
  category = "Uploaded document",
  caseId: string | null = null
): Promise<PortalDocument> {
  const supabase = createClient();
  const user = await requireUser(supabase);

  const path = `${user.id}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
  if (uploadError) throw uploadError;

  const row = {
    user_id: user.id,
    name: file.name,
    category,
    storage_path: path,
    size_bytes: file.size,
    case_id: caseId,
  };
  let { data, error } = await supabase.from("documents").insert(row).select().single();
  if (isMissingColumnError(error)) {
    const { case_id: _omit, ...legacyRow } = row;
    void _omit;
    ({ data, error } = await supabase.from("documents").insert(legacyRow).select().single());
  }
  if (error) throw error;
  return mapDocument(data as DocumentRow);
}

export async function deleteDocument(doc: PortalDocument): Promise<void> {
  const supabase = createClient();
  if (doc.storagePath) {
    await supabase.storage.from("documents").remove([doc.storagePath]);
  }
  const { error } = await supabase.from("documents").delete().eq("id", doc.id);
  if (error) throw error;
}

// A local record older than this is treated as an abandoned attempt from
// some earlier, unrelated visit rather than "just ran this, then signed
// up" — it's discarded instead of migrated, so it can't silently resurface
// and attach itself to a much later, unrelated sign-up.
const STALE_RECORD_MS = 24 * 60 * 60 * 1000; // 24 hours

export type MigrationResult = { accountId: string | null; caseId: string | null };
const NO_MIGRATION: MigrationResult = { accountId: null, caseId: null };

// ── Migrating a pre-signup wizard result into the real database ───────
// Called from every portal page that loads accounts/cases, so whichever
// page the user lands on first performs the migration.
//
// This is wrapped in a module-level shared promise because several pages
// (and React Strict Mode's dev-only double-invoke of effects) can call it
// "at once" — without this, two concurrent calls would both read the same
// pending local record before either had cleared it, inserting it twice.
// Sharing one in-flight promise means every caller awaits the same run.
let migrationPromise: Promise<MigrationResult> | null = null;

export function migratePendingLocalRecords(): Promise<MigrationResult> {
  if (!migrationPromise) {
    migrationPromise = runMigration().catch((err) => {
      // Non-fatal: a failed migration shouldn't block the page from
      // loading the rest of the user's real data. Log it and let a later
      // call retry rather than staying stuck on one failure.
      console.error("migratePendingLocalRecords failed:", err);
      migrationPromise = null;
      return NO_MIGRATION;
    });
  }
  return migrationPromise;
}

async function runMigration(): Promise<MigrationResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NO_MIGRATION;

  let accountId: string | null = null;
  let caseId: string | null = null;

  const localAccount = getLocalAccount();
  if (localAccount) {
    if (Date.now() - localAccount.savedAt > STALE_RECORD_MS) {
      // Too old to be "this session" — drop it rather than migrate it.
      clearLocalAccount();
    } else {
      try {
        const created = await createAccount({
          handle: localAccount.handle,
          platform: localAccount.platform,
          health: localAccount.health,
          level: localAccount.level,
          protectionActive: localAccount.protectionActive,
          categories: localAccount.categories,
        });
        accountId = created.id;
        clearLocalAccount();
      } catch (err) {
        console.error("Failed to migrate local account:", err);
      }
    }
  }

  const localCase = getLocalCase();
  if (localCase) {
    if (Date.now() - localCase.savedAt > STALE_RECORD_MS) {
      clearLocalCase();
    } else {
      try {
        const created = await createCase({
          title: localCase.title,
          platform: localCase.platform,
          accountHandle: localCase.accountHandle,
          issue: localCase.issue,
          timeline: localCase.timeline,
        });
        caseId = created.id;
        clearLocalCase();
      } catch (err) {
        console.error("Failed to migrate local case:", err);
      }
    }
  }

  return { accountId, caseId };
}
