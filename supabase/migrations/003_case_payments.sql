-- Adds payment tracking to cases (pay-before-recovery-starts flow) and
-- links invoices to cases as well as subscriptions. Run this in the
-- Supabase SQL Editor the same way as schema.sql.

alter table public.cases
  add column if not exists issue text,
  add column if not exists fee_amount_kobo bigint,
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'failed'));

alter table public.invoices
  add column if not exists case_id uuid references public.cases (id) on delete set null;
