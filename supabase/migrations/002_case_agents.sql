-- Adds an assigned-agent identity to each case, so clients have a named
-- point of contact instead of an anonymous "Case Team". Run this in the
-- Supabase SQL Editor the same way as schema.sql.

alter table public.cases
  add column if not exists agent_name text,
  add column if not exists agent_phone text,
  add column if not exists agent_email text;
