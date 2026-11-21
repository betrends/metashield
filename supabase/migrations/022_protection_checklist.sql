-- Which protection checklist steps each client has marked as done (the 6
-- steps in src/lib/protection-steps.ts: selfie, birthday, devices, contacts,
-- two_factor, guidelines). Each done step raises the account health shown in
-- the portal, up to 95 when all six are done. Clients manage only their own.
create table if not exists public.protection_checklist (
  user_id uuid not null references auth.users (id) on delete cascade,
  step text not null check (step in ('selfie', 'birthday', 'devices', 'contacts', 'two_factor', 'guidelines')),
  done_at timestamptz not null default now(),
  primary key (user_id, step)
);

alter table public.protection_checklist enable row level security;

drop policy if exists "Clients read their own checklist" on public.protection_checklist;
create policy "Clients read their own checklist" on public.protection_checklist
  for select using (auth.uid() = user_id);

drop policy if exists "Clients tick their own checklist" on public.protection_checklist;
create policy "Clients tick their own checklist" on public.protection_checklist
  for insert with check (auth.uid() = user_id);

drop policy if exists "Clients untick their own checklist" on public.protection_checklist;
create policy "Clients untick their own checklist" on public.protection_checklist
  for delete using (auth.uid() = user_id);
