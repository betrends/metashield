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
import type { FollowerRange } from "@/lib/portal/case-fees";
import { pickDefaultCaseId, safeStorageName } from "@/lib/portal/case-rules";
import { pickPaymentRecord, type PaymentKind, type PaymentRecord } from "@/lib/portal/payments";

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
  // The authoritative payment record; render it via summarizePayment()
  // (lib/portal/payments.ts) so every screen agrees.
  payment: PaymentRecord;
  cancelledAt: string | null;
  cancellationRequestedAt: string | null;
};

export type PortalMessage = {
  id: string;
  from: "client" | "team";
  authorName: string;
  body: string;
  date: string;
  createdAt: string;
  caseId?: string;
  attachment?: string;
  attachmentPath?: string;
  attachmentType?: string;
  attachmentSize?: number;
  kind: "message" | "system" | "form_request";
  readAt: string | null;
};

export type PortalDocument = {
  id: string;
  name: string;
  category: string;
  uploadedDate: string;
  sizeLabel: string;
  storagePath: string | null;
  caseId: string | null;
  reviewStatus: "submitted" | "approved" | "rejected";
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
    payment: pickPaymentRecord(row as unknown as Record<string, unknown>),
    cancelledAt: (row as unknown as { cancelled_at?: string | null }).cancelled_at ?? null,
    cancellationRequestedAt:
      (row as unknown as { cancellation_requested_at?: string | null }).cancellation_requested_at ?? null,
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

// Case creation, stage changes and payment-status changes all happen on
// the server (see /api/portal/cases): the fee, agent and starting stage
// are decided there, not by the browser.
export async function createCase(input: {
  title: string;
  platform: string;
  accountHandle: string;
  issue: string;
  followerRange?: FollowerRange;
  timeline?: { event: string }[];
  screenshotUrl?: string | null;
  termsAccepted: boolean;
}): Promise<PortalCase> {
  const res = await fetch("/api/portal/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) {
    throw new Error(res.status === 401 ? "You need to be signed in." : "Couldn't create the case — please try again.");
  }
  const created = await fetchCase(data.id);
  if (!created) throw new Error("Case was created but couldn't be loaded — please refresh.");
  return created;
}

// Bank-transfer flow: the client uploads proof of payment to their own
// Storage folder, then the server records it and puts the case into
// "pending_review" until the admin confirms it (see /admin/payments).
export async function submitPaymentReceipt(
  caseId: string,
  file: File,
  kind: PaymentKind = "deposit"
): Promise<PortalCase> {
  const supabase = createClient();
  const user = await requireUser(supabase);

  const path = `${user.id}/receipts/${caseId}-${Date.now()}-${safeStorageName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
  if (uploadError) throw uploadError;

  const res = await fetch("/api/portal/cases/receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId, storagePath: path, kind }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.error === "not_payable"
        ? data.status === "pending_review"
          ? "A receipt for this payment is already being reviewed — no need to pay again."
          : data.status === "paid"
            ? "This payment is already confirmed — no need to pay again."
            : "This payment isn't due yet."
        : "Your receipt was uploaded but couldn't be recorded — please try again."
    );
  }

  // Let the team know a receipt needs review. Fire-and-forget — the
  // receipt itself is already recorded regardless of whether this succeeds.
  fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "payment_receipt",
      name: (user.user_metadata?.full_name as string | undefined) || "A client",
      email: user.email || "unknown",
      message: `${kind === "deposit" ? "Deposit" : "Final balance"} receipt submitted for case "${data.title}" (${caseId}). Review it at /admin/payments.`,
      metadata: { caseId, caseTitle: data.title, kind, amountKobo: String(data.amountKobo ?? "") },
    }),
  }).catch(() => {});

  const updated = await fetchCase(caseId);
  if (!updated) throw new Error("Receipt recorded — please refresh to see the update.");
  return updated;
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
  attachment_type?: string | null;
  attachment_size?: number | null;
  kind?: "message" | "system" | "form_request" | null;
  read_at?: string | null;
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
    createdAt: row.created_at,
    caseId: row.case_id ?? undefined,
    attachment: row.attachment_name ?? undefined,
    attachmentPath: row.attachment_path ?? undefined,
    attachmentType: row.attachment_type ?? undefined,
    attachmentSize: row.attachment_size ?? undefined,
    kind: row.kind ?? "message",
    readAt: row.read_at ?? null,
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

export const MESSAGE_PAGE_SIZE = 50;

// Newest page of the client's messages (oldest first for display). Pass
// `before` (an ISO time) to load the page before it.
export async function fetchMessages(opts: { before?: string; limit?: number } = {}): Promise<PortalMessage[]> {
  const supabase = createClient();
  let query = supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? MESSAGE_PAGE_SIZE);
  if (opts.before) query = query.lt("created_at", opts.before);
  const { data, error } = await query;
  if (error) throw error;
  return (data as MessageRow[]).map(mapMessage).reverse();
}

// Marks the team's messages to this client as read (server-side, so
// clients can't edit message content).
export async function markTeamMessagesRead(caseId?: string | null): Promise<void> {
  await fetch("/api/portal/messages/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId: caseId ?? null }),
  }).catch(() => {});
}

export async function sendMessage(input: {
  body: string;
  caseId?: string | null;
  attachmentName?: string | null;
  attachmentFile?: File | null;
  // Same key on a retry → the message is stored only once.
  dedupeKey?: string;
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
    attachment_type: input.attachmentFile?.type || null,
    attachment_size: input.attachmentFile?.size ?? null,
    dedupe_key: input.dedupeKey ? `client:${user.id}:${input.dedupeKey}` : null,
  };
  let { data, error } = await supabase.from("messages").insert(row).select().single();
  if (error?.code === "23505" && row.dedupe_key) {
    // A previous attempt already got through — return that message.
    const existing = await supabase.from("messages").select("*").eq("dedupe_key", row.dedupe_key).maybeSingle();
    if (existing.data) return mapMessage(existing.data as MessageRow);
  }
  if (isMissingColumnError(error)) {
    const { attachment_path: _a, attachment_type: _b, attachment_size: _c, dedupe_key: _d, ...legacyRow } = row;
    void _a;
    void _b;
    void _c;
    void _d;
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
  review_status?: "submitted" | "approved" | "rejected" | null;
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
    reviewStatus: row.review_status ?? "submitted",
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
          // A local case is only saved by the wizard after its Terms
          // checkbox is ticked (EligibilityWizard.handleSubmitCase).
          termsAccepted: true,
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

// ── Case workflow (documents, terms, recovery form, cancellation) ─────

export type CaseDocumentItem = {
  id: string;
  name: string;
  category: string;
  sizeBytes: number | null;
  mimeType: string | null;
  storagePath: string | null;
  createdAt: string;
  reviewStatus: "submitted" | "approved" | "rejected";
  reviewNote: string | null;
};

export async function fetchCaseDocuments(caseId: string): Promise<CaseDocumentItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, name, category, size_bytes, mime_type, storage_path, created_at, review_status, review_note")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((d) => ({
    id: d.id as string,
    name: d.name as string,
    category: d.category as string,
    sizeBytes: (d.size_bytes as number | null) ?? null,
    mimeType: (d.mime_type as string | null) ?? null,
    storagePath: (d.storage_path as string | null) ?? null,
    createdAt: d.created_at as string,
    reviewStatus: ((d.review_status as string) ?? "submitted") as CaseDocumentItem["reviewStatus"],
    reviewNote: (d.review_note as string | null) ?? null,
  }));
}

export async function fetchCaseWorkflow(
  caseId: string,
  termsVersion: string
): Promise<{ termsAcceptedAt: string | null; formSubmittedAt: string | null }> {
  const supabase = createClient();
  const [terms, form] = await Promise.all([
    supabase
      .from("case_terms_acceptances")
      .select("accepted_at")
      .eq("case_id", caseId)
      .eq("terms_version", termsVersion)
      .maybeSingle(),
    supabase.from("recovery_form_submissions").select("submitted_at").eq("case_id", caseId).maybeSingle(),
  ]);
  return {
    termsAcceptedAt: (terms.data?.accepted_at as string | undefined) ?? null,
    formSubmittedAt: (form.data?.submitted_at as string | undefined) ?? null,
  };
}

export async function acceptRecoveryTerms(caseId: string, version: string): Promise<void> {
  const res = await fetch("/api/portal/cases/terms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId, version, accepted: true }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error === "terms_changed" ? "The terms were updated — please read them again." : "Couldn't save — please try again.");
  }
}

export async function submitRecoveryForm(
  caseId: string,
  answers: Record<string, string>
): Promise<{ ok: true; stage?: string } | { ok: false; message: string; errors?: Record<string, string> }> {
  try {
    const res = await fetch("/api/portal/cases/form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, answers }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, stage: data.stage };
    return { ok: false, message: data.message || "Please check the highlighted answers.", errors: data.errors };
  } catch {
    return { ok: false, message: "Network error — please try again." };
  }
}

export async function cancelCase(
  caseId: string,
  reason: string
): Promise<{ ok: true; outcome: "cancelled" | "requested" } | { ok: false; message: string }> {
  try {
    const res = await fetch("/api/portal/cases/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, outcome: data.outcome };
    return { ok: false, message: data.message || "Couldn't do that — please try again." };
  } catch {
    return { ok: false, message: "Network error — please try again." };
  }
}
