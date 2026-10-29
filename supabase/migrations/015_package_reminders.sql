-- Package renewal reminders: one row per email sent, so each reminder
-- (3 days before the end, and on the day it ends) goes out only once per
-- package period. Server-only (no client access). Safe to run more than once.
create table if not exists public.package_reminders (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  kind text not null check (kind in ('ending_soon', 'ended')),
  period_end date not null,
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now(),
  unique (subscription_id, kind, period_end)
);
alter table public.package_reminders enable row level security;
