-- Phase 1 fixes: link documents and message attachments to cases so
-- clients, agents and the admin all see the same files.
-- Run this in the Supabase SQL Editor the same way as the earlier ones.
--
-- Safe to run more than once. It only ADDS nullable columns and indexes
-- and re-asserts check constraints with a superset of the values they
-- already allow. No existing row is updated or deleted.

-- ── Documents → case ──────────────────────────────────────────────────
-- Documents had no case_id, so the admin/agent Documents page could not
-- tell which case (or which agent) a file belonged to.
alter table public.documents
  add column if not exists case_id uuid references public.cases (id) on delete set null;
create index if not exists documents_case_id_idx on public.documents (case_id);
create index if not exists documents_user_id_idx on public.documents (user_id);

-- ── Message attachments ───────────────────────────────────────────────
-- Only the attachment's file NAME was ever saved; the file itself was
-- never uploaded. attachment_path holds its Storage path ("documents"
-- bucket, under "<user-id>/attachments/…").
alter table public.messages
  add column if not exists attachment_path text;
create index if not exists messages_case_id_idx on public.messages (case_id);
create index if not exists messages_user_id_idx on public.messages (user_id);

-- ── Case payment status ───────────────────────────────────────────────
-- Re-asserts the constraint from 004_payment_receipts.sql. If 004 was
-- never run, "pending_review" is rejected and every receipt upload fails,
-- leaving the case "Unpaid" forever. Same values as 004 — nothing narrows.
alter table public.cases drop constraint if exists cases_payment_status_check;
alter table public.cases
  add constraint cases_payment_status_check
  check (payment_status in ('unpaid', 'pending_review', 'paid', 'failed'));
alter table public.cases
  add column if not exists receipt_storage_path text;
-- Agent lookups (cases.agent_id comes from 005_agents.sql; skipped if
-- that migration hasn't been run).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cases' and column_name = 'agent_id'
  ) then
    create index if not exists cases_agent_id_idx on public.cases (agent_id);
  end if;
end $$;

-- ── Subscription plans ────────────────────────────────────────────────
-- The app sells an "Annual Protection" plan (plan_id 'one_time'), but the
-- original check only allowed basic/professional/business, so a successful
-- Annual payment could not be recorded and the plan stayed inactive.
alter table public.subscriptions drop constraint if exists subscriptions_plan_id_check;
alter table public.subscriptions
  add constraint subscriptions_plan_id_check
  check (plan_id in ('basic', 'professional', 'business', 'one_time'));

-- Payment reference used by /api/subscribe/verify (from 009); re-asserted
-- so verification works even if 009 was skipped.
alter table public.invoices
  add column if not exists paystack_reference text;
