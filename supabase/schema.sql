-- AccountGuard database schema.
-- Run this once in the Supabase dashboard: Project → SQL Editor → New query
-- → paste this whole file → Run.
--
-- This creates every table the portal needs, plus Row Level Security (RLS)
-- policies so each signed-in user can only ever see their own data.

-- ── Profiles ────────────────────────────────────────────────────────────
-- One row per signed-up user, created automatically on sign-up (see the
-- trigger at the bottom). Mirrors auth.users but lets us store extra
-- fields Supabase Auth doesn't have a column for.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Accounts (the social/business accounts being monitored) ────────────
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  handle text not null,
  platform text not null,
  health integer not null default 0 check (health between 0 and 100),
  level text not null default 'low' check (level in ('low', 'medium', 'high')),
  protection_active boolean not null default false,
  -- e.g. [{ "label": "Security", "level": "medium" }, ...]
  categories jsonb,
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

create policy "Users can manage their own accounts"
  on public.accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Cases (recovery cases) ──────────────────────────────────────────────
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  title text not null,
  platform text not null,
  account_handle text not null,
  stage text not null default 'New Lead' check (
    stage in (
      'New Lead', 'Assessment Pending', 'Payment Pending',
      'Documents Required', 'Under Review', 'Recovery Process',
      'Awaiting Platform Response', 'Resolved'
    )
  ),
  created_at timestamptz not null default now()
);

alter table public.cases enable row level security;

create policy "Users can manage their own cases"
  on public.cases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Case timeline events ────────────────────────────────────────────────
create table if not exists public.case_timeline_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  event text not null,
  created_at timestamptz not null default now()
);

alter table public.case_timeline_events enable row level security;

create policy "Users can view timeline events on their own cases"
  on public.case_timeline_events for select
  using (
    exists (
      select 1 from public.cases
      where cases.id = case_timeline_events.case_id
        and cases.user_id = auth.uid()
    )
  );

create policy "Users can insert timeline events on their own cases"
  on public.case_timeline_events for insert
  with check (
    exists (
      select 1 from public.cases
      where cases.id = case_timeline_events.case_id
        and cases.user_id = auth.uid()
    )
  );

-- ── Messages ─────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  case_id uuid references public.cases (id) on delete set null,
  from_role text not null check (from_role in ('client', 'team')),
  author_name text not null,
  body text not null,
  attachment_name text,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Users can manage their own messages"
  on public.messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Documents ────────────────────────────────────────────────────────────
-- Metadata only. Actual files belong in a Supabase Storage bucket named
-- "documents" (create it in Dashboard → Storage), with the file's storage
-- path saved in storage_path.
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null,
  storage_path text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "Users can manage their own documents"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Subscriptions (Account Protection plans, billed via Korapay) ───────
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null check (plan_id in ('basic', 'professional', 'business')),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  renews_on date,
  korapay_customer_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Subscriptions are written by the server (via the service role key, which
-- bypasses RLS) after a verified Korapay webhook — not directly by users.

-- ── Invoices (payment history) ──────────────────────────────────────────
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  amount_kobo bigint not null,
  currency text not null default 'NGN',
  status text not null default 'paid' check (status in ('paid', 'failed', 'pending')),
  korapay_reference text unique,
  created_at timestamptz not null default now()
);

alter table public.invoices enable row level security;

create policy "Users can view their own invoices"
  on public.invoices for select
  using (auth.uid() = user_id);

-- ── Contact submissions (contact form + wizard leads) ───────────────────
-- Visitors submitting these aren't necessarily signed in yet, so this
-- table is written via the server's service role key rather than a
-- user-scoped policy.
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'contact_form' check (
    source in ('contact_form', 'health_check', 'recovery_eligibility')
  ),
  name text not null,
  email text not null,
  phone text,
  message text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.contact_submissions enable row level security;
-- No select/insert policy for regular users — this table is only read and
-- written by server code using the service role key.
