-- Workflow batch A: payment ledger, document review, stage history,
-- message read status / de-duplication, client cancellation, terms
-- acceptance, recovery form submissions, eligibility follow-up emails.
--
-- Additive and idempotent: new tables and nullable/defaulted columns
-- only. No existing row is changed. Safe to run with the current app.
-- Every new table has RLS on; clients may only READ their own rows where
-- noted, and all writes go through server routes (service role).

-- ── 1. Payment ledger: one row per submitted/confirmed installment ─────
-- Records reference, amount, type, timestamps and status for every
-- payment. The partial unique index makes it impossible to confirm the
-- same installment twice, even under concurrent requests.
create table if not exists public.payment_ledger (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  kind text not null check (kind in ('deposit', 'balance')),
  amount_kobo bigint not null check (amount_kobo >= 0),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'confirmed', 'rejected')),
  method text not null default 'bank_transfer',
  reference text,
  receipt_storage_path text,
  note text,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now()
);
create index if not exists payment_ledger_case_id_idx on public.payment_ledger (case_id);
create unique index if not exists payment_ledger_one_confirmed_per_kind
  on public.payment_ledger (case_id, kind) where status = 'confirmed';
alter table public.payment_ledger enable row level security;
drop policy if exists "Users can view their own payments" on public.payment_ledger;
create policy "Users can view their own payments"
  on public.payment_ledger for select using (auth.uid() = user_id);

-- ── 2. Document review: submission is not approval ─────────────────────
alter table public.documents
  add column if not exists review_status text not null default 'submitted',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text,
  add column if not exists review_note text,
  add column if not exists mime_type text;
alter table public.documents drop constraint if exists documents_review_status_check;
alter table public.documents
  add constraint documents_review_status_check
  check (review_status in ('submitted', 'approved', 'rejected'));

-- ── 3. Stage history: every transition, who/what made it, and why ──────
create table if not exists public.case_stage_history (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  from_stage text,
  to_stage text not null,
  actor_role text not null check (actor_role in ('system', 'admin', 'agent', 'client')),
  actor text,
  reason text,
  is_correction boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists case_stage_history_case_id_idx on public.case_stage_history (case_id, created_at);
alter table public.case_stage_history enable row level security;
-- Server-only (no client policies).

-- ── 4. Messages: read status, de-duplication, attachment details ───────
alter table public.messages
  add column if not exists read_at timestamptz,
  add column if not exists dedupe_key text,
  add column if not exists kind text not null default 'message',
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint,
  add column if not exists metadata jsonb;
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages
  add constraint messages_kind_check check (kind in ('message', 'system', 'form_request'));
-- A retried send (same key) or a repeated automatic message can't be
-- stored twice.
create unique index if not exists messages_dedupe_key_key
  on public.messages (dedupe_key) where dedupe_key is not null;
create index if not exists messages_unread_idx
  on public.messages (case_id, from_role) where read_at is null;

-- ── 5. Client cancellation (records are kept, never hard-deleted) ──────
alter table public.cases
  add column if not exists cancellation_requested_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by text;

-- ── 6. Terms acceptance (text to be supplied; versioned) ───────────────
create table if not exists public.case_terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  unique (case_id, terms_version)
);
alter table public.case_terms_acceptances enable row level security;
drop policy if exists "Users can view their own terms acceptances" on public.case_terms_acceptances;
create policy "Users can view their own terms acceptances"
  on public.case_terms_acceptances for select using (auth.uid() = user_id);

-- ── 7. Recovery form submissions (one per case) ───────────────────────
create table if not exists public.recovery_form_submissions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  form_version text not null default 'v1',
  answers jsonb not null,
  submitted_at timestamptz not null default now()
);
alter table public.recovery_form_submissions enable row level security;
drop policy if exists "Users can view their own recovery forms" on public.recovery_form_submissions;
create policy "Users can view their own recovery forms"
  on public.recovery_form_submissions for select using (auth.uid() = user_id);

-- ── 8. Eligibility follow-up emails: consent, delivery log, unsubscribe ─
alter table public.contact_submissions
  add column if not exists email_consent boolean not null default false,
  add column if not exists followup_status text,
  add column if not exists followup_sent_at timestamptz,
  add column if not exists followup_error text;
create table if not exists public.email_unsubscribes (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.email_unsubscribes enable row level security;
-- Server-only (no client policies).
