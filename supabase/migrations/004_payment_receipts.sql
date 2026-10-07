-- Bank-transfer + receipt-review payment flow for recovery cases (real
-- money goes straight to your bank account — Korapay is reserved for the
-- Account Protection subscription only, not case fees).
-- Run this in the Supabase SQL Editor the same way as the earlier ones.

alter table public.cases
  add column if not exists receipt_storage_path text;

-- Widen payment_status to include the "receipt submitted, awaiting agent
-- confirmation" state.
alter table public.cases drop constraint if exists cases_payment_status_check;
alter table public.cases
  add constraint cases_payment_status_check
  check (payment_status in ('unpaid', 'pending_review', 'paid', 'failed'));

-- Lets a submitted receipt reuse the existing internal-notify pipeline.
alter table public.contact_submissions drop constraint if exists contact_submissions_source_check;
alter table public.contact_submissions
  add constraint contact_submissions_source_check
  check (source in ('contact_form', 'health_check', 'recovery_eligibility', 'payment_receipt'));
