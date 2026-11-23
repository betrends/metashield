-- Health check history. Every check a signed-in client runs (or ran just
-- before signing up) is kept here, with or without a package. An account
-- becomes protected only when the client adds it for protection and their
-- package covers it (account_id then points at the protected account).
-- Clients see and manage only their own history.
create table if not exists public.health_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  handle text not null,
  platform text not null,
  health integer not null check (health between 0 and 100),
  level text not null check (level in ('low', 'medium', 'high')),
  categories jsonb,
  account_id uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists health_checks_user_idx on public.health_checks (user_id, created_at desc);

alter table public.health_checks enable row level security;

drop policy if exists "Clients read their own health checks" on public.health_checks;
create policy "Clients read their own health checks" on public.health_checks
  for select using (auth.uid() = user_id);

drop policy if exists "Clients save their own health checks" on public.health_checks;
create policy "Clients save their own health checks" on public.health_checks
  for insert with check (auth.uid() = user_id);

drop policy if exists "Clients link their own health checks" on public.health_checks;
create policy "Clients link their own health checks" on public.health_checks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Clients delete their own health checks" on public.health_checks;
create policy "Clients delete their own health checks" on public.health_checks
  for delete using (auth.uid() = user_id);
