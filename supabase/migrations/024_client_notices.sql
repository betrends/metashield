-- Personal banners on a client's dashboard, added by the team from the
-- admin client page. kind 'recovered': "Your account is back — now protect
-- it", shown until the client starts a package or closes the banner.
-- Clients can read and close only their own; only the server adds them.
create table if not exists public.client_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('recovered')),
  created_at timestamptz not null default now(),
  dismissed_at timestamptz
);
create index if not exists client_notices_user_idx on public.client_notices (user_id);

alter table public.client_notices enable row level security;

drop policy if exists "Clients read their own notices" on public.client_notices;
create policy "Clients read their own notices" on public.client_notices
  for select using (auth.uid() = user_id);

drop policy if exists "Clients close their own notices" on public.client_notices;
create policy "Clients close their own notices" on public.client_notices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
