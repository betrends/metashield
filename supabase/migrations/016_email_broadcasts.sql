-- Bulk emails from Admin → Email users (api/admin/broadcast).
-- email_broadcasts: one row per send. email_broadcast_recipients: one row
-- per person, unique per send, so nobody gets the same email twice.
-- Only the server (service role) reads or writes these tables.

create table if not exists public.email_broadcasts (
  id uuid primary key default gen_random_uuid(),
  request_id text unique,
  subject text not null,
  template text not null default 'packages_announcement',
  audience jsonb not null default '{}'::jsonb,
  created_by text,
  status text not null default 'sending' check (status in ('sending', 'done', 'stopped', 'failed')),
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.email_broadcast_recipients (
  id bigint generated always as identity primary key,
  broadcast_id uuid not null references public.email_broadcasts (id) on delete cascade,
  email text not null,
  name text,
  kind text not null default 'client' check (kind in ('client', 'lead')),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  error text,
  sent_at timestamptz,
  unique (broadcast_id, email)
);

create index if not exists email_broadcast_recipients_pending_idx
  on public.email_broadcast_recipients (broadcast_id, status, id);

alter table public.email_broadcasts enable row level security;
alter table public.email_broadcast_recipients enable row level security;
