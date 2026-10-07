-- Real staff/agent roster, replacing the hardcoded placeholder list in
-- src/lib/portal/agents.ts. Lets the admin add agents, see their
-- performance, and assign/reassign cases to a specific one.

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.agents enable row level security;

-- Any signed-in client can see the *active* roster (their case pages
-- already show an assigned agent's name/phone/email pulled from here at
-- assignment time) — but only the service role (admin routes) can
-- write, matching the subscriptions/invoices pattern elsewhere.
drop policy if exists "Authenticated users can view active agents" on public.agents;
create policy "Authenticated users can view active agents"
  on public.agents for select
  to authenticated
  using (active = true);

-- Link cases to a real agent row instead of only the denormalized
-- agent_name/agent_phone/agent_email columns (kept as-is for display —
-- this column is what admin assignment/reassignment actually updates).
alter table public.cases add column if not exists agent_id uuid references public.agents (id) on delete set null;

-- Seed the 3 placeholder identities that already exist on real case rows
-- (see src/lib/portal/agents.ts) so existing cases can be backfilled
-- below instead of showing "unassigned".
insert into public.agents (name, email, phone)
select v.name, v.email, v.phone
from (values
  ('Adaeze Okonkwo', 'adaeze@example.com', '+2348010000001'),
  ('Tunde Bakare', 'tunde@example.com', '+2348010000002'),
  ('Chiamaka Eze', 'chiamaka@example.com', '+2348010000003')
) as v(name, email, phone)
where not exists (select 1 from public.agents where agents.name = v.name);

update public.cases
set agent_id = agents.id
from public.agents
where cases.agent_name = agents.name
  and cases.agent_id is null;
