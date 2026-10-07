-- Lets the admin Support Tickets page mark a contact_submissions row
-- (contact form / health check / recovery eligibility / payment receipt
-- notifications) as resolved instead of just reading it once and losing
-- track of it.

alter table public.contact_submissions
  add column if not exists status text not null default 'open' check (status in ('open', 'resolved'));
