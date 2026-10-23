-- READ-ONLY diagnostics for the Phase 1 issues. Every statement is a
-- SELECT — nothing here changes data. Run in the Supabase SQL Editor and
-- compare the results with the notes beside each query.

-- 1. Which migrations are live? If 'pending_review' is missing from the
--    first row, migration 004 was never run and every receipt upload has
--    been failing (cases stay "Unpaid"). If 'one_time' is missing from the
--    second, Annual Protection payments can't be recorded.
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in ('cases_payment_status_check', 'subscriptions_plan_id_check');

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('cases', 'agent_id'), ('cases', 'receipt_storage_path'),
    ('documents', 'case_id'), ('messages', 'attachment_path'),
    ('invoices', 'paystack_reference')
  )
order by 1, 2;

-- 2. Payment state vs. stage. Rows here are cases staff moved forward
--    without confirming payment — the client still sees "Payment required".
select id, title, stage, payment_status, created_at
from public.cases
where payment_status <> 'paid'
  and stage not in ('New Lead', 'Assessment Pending', 'Payment Pending')
order by created_at desc;

-- 3. Unpaid cases that DO have a receipt file (status write failed after
--    upload) — candidates for manual confirmation on /admin/payments.
select id, title, payment_status, receipt_storage_path
from public.cases
where payment_status = 'unpaid' and receipt_storage_path is not null;

-- 4. Cases no agent can see (agent_id missing) — invisible in every
--    agent's "My Cases", Messages and Documents.
select id, title, agent_name, agent_email, stage, payment_status
from public.cases
where agent_id is null
order by created_at desc;

-- 5. Cases stuck at "Documents Required", with how many documents the
--    client has uploaded (any case) since the case was created.
select c.id, c.title, c.created_at,
       (select count(*) from public.documents d
         where d.user_id = c.user_id and d.created_at >= c.created_at) as docs_uploaded_since
from public.cases c
where c.stage = 'Documents Required'
order by c.created_at;

-- 6. Client messages not linked to a case — hidden from agents before
--    this fix — and messages whose "attachment" was only a file name.
select count(*) filter (where case_id is null and from_role = 'client') as client_msgs_without_case,
       count(*) filter (where attachment_name is not null) as msgs_with_attachment_name
from public.messages;

-- 7. (Phase 2, after 012) Cases resolved BEFORE deposit/balance tracking
--    existed: deposit counted as paid, but no completion time was ever
--    recorded, so no final balance has been scheduled for them. Decide
--    case by case; nothing is billed automatically.
select id, title, stage, payment_status, fee_amount_kobo,
       fee_amount_kobo - coalesce(deposit_amount_kobo, fee_amount_kobo / 2) as balance_if_billed_kobo
from public.cases
where stage = 'Resolved' and recovery_completed_at is null and payment_status = 'paid'
order by created_at desc;
