-- OPTIONAL data repair — review before running. Not a migration.
--
-- Cases created while the agent roster lookup returned nothing were given
-- a placeholder agent NAME but no agent_id, so no agent can see them.
-- This links each such case to the real agent row with the same email
-- (or, failing that, the same name). Cases that match nothing are left
-- unassigned for the admin to assign on /admin/cases.
--
-- Step 1 — PREVIEW (read-only). Run this first and check the matches.
select c.id as case_id, c.title, c.agent_name, c.agent_email,
       a.id as will_link_to_agent, a.name as agent_row_name, a.email as agent_row_email
from public.cases c
left join lateral (
  select a.* from public.agents a
  where a.active
    and (lower(a.email) = lower(c.agent_email) or (c.agent_email is null and a.name = c.agent_name))
  order by (lower(a.email) = lower(coalesce(c.agent_email, ''))) desc
  limit 1
) a on true
where c.agent_id is null
order by c.created_at desc;

-- Step 2 — APPLY. Uncomment and run only after checking Step 1.
-- Only fills agent_id where it is currently NULL; nothing else changes.
--
-- update public.cases c
-- set agent_id = (
--   select a.id from public.agents a
--   where a.active
--     and (lower(a.email) = lower(c.agent_email) or (c.agent_email is null and a.name = c.agent_name))
--   order by (lower(a.email) = lower(coalesce(c.agent_email, ''))) desc
--   limit 1
-- )
-- where c.agent_id is null
--   and exists (
--     select 1 from public.agents a
--     where a.active
--       and (lower(a.email) = lower(c.agent_email) or (c.agent_email is null and a.name = c.agent_name))
--   );
