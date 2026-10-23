-- Phase 2: 50% deposit + final balance for recovery cases.
--
-- Payment is still by bank transfer with admin verification. These
-- columns, all on public.cases, are the single authoritative payment
-- record that every portal reads (via src/lib/portal/payments.ts). Only
-- the server writes them (clients have no update policy on cases — 011).
--
--   payment_status        existing column; now means the DEPOSIT status
--   deposit_amount_kobo   50% of fee_amount_kobo, fixed at case creation
--   deposit_paid_at       when an admin verified the deposit transfer
--   recovery_completed_at when the case was recorded as Resolved
--   balance_amount_kobo   fee − deposit, fixed at completion
--   balance_due_at        recovery_completed_at + 24 hours
--   balance_status        not_due → due → pending_review → paid (or failed)
--   balance_receipt_storage_path, balance_paid_at
--   terms_accepted_at     when the client accepted the Terms for this case
--
-- Additive and idempotent: no existing row is updated. Existing cases
-- read as "deposit = 50% of fee, balance not yet due"; cases already
-- marked paid count as deposit paid. Prices (fee_amount_kobo) unchanged.

alter table public.cases
  add column if not exists deposit_amount_kobo bigint,
  add column if not exists deposit_paid_at timestamptz,
  add column if not exists recovery_completed_at timestamptz,
  add column if not exists balance_amount_kobo bigint,
  add column if not exists balance_due_at timestamptz,
  add column if not exists balance_status text not null default 'not_due',
  add column if not exists balance_receipt_storage_path text,
  add column if not exists balance_paid_at timestamptz,
  add column if not exists terms_accepted_at timestamptz;

alter table public.cases drop constraint if exists cases_balance_status_check;
alter table public.cases
  add constraint cases_balance_status_check
  check (balance_status in ('not_due', 'due', 'pending_review', 'paid', 'failed'));

-- Amounts can't be negative, and the two installments can never exceed
-- the agreed total.
alter table public.cases drop constraint if exists cases_installments_check;
alter table public.cases
  add constraint cases_installments_check
  check (
    (deposit_amount_kobo is null or deposit_amount_kobo >= 0)
    and (balance_amount_kobo is null or balance_amount_kobo >= 0)
    and (
      fee_amount_kobo is null
      or coalesce(deposit_amount_kobo, 0) + coalesce(balance_amount_kobo, 0) <= fee_amount_kobo
    )
  );

-- A balance deadline only exists once completion is recorded.
alter table public.cases drop constraint if exists cases_balance_deadline_check;
alter table public.cases
  add constraint cases_balance_deadline_check
  check (balance_due_at is null or recovery_completed_at is not null);

create index if not exists cases_balance_status_idx on public.cases (balance_status)
  where balance_status <> 'not_due';
