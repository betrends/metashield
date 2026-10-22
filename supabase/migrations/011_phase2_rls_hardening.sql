-- Phase 2: stop clients from changing what only staff should change.
--
-- Before this, the "for all" policies on cases and messages let any
-- signed-in client, from their browser, mark their own case "paid",
-- change its stage or fee, reassign its agent, delete it, post messages
-- as the team, and write fake timeline events (e.g. "Payment confirmed",
-- which the admin dashboard counts as revenue).
--
-- After this, clients can still READ all of their own data. Every write
-- to cases and case_timeline_events goes through server routes using the
-- service role (which bypasses RLS):
--   POST /api/portal/cases          — create a case (fee computed server-side)
--   POST /api/portal/cases/receipt  — submit a payment receipt
--
-- REQUIRES 010_phase1_case_links.sql (documents.case_id).
-- DEPLOY ORDER: deploy the app code from this branch FIRST, then run this
-- file. Older app code creates cases from the browser and would be
-- blocked by these policies.
--
-- Safe to run more than once. It only replaces policies; no rows change.

-- ── Cases: read-only for clients ──────────────────────────────────────
drop policy if exists "Users can manage their own cases" on public.cases;
drop policy if exists "Users can view their own cases" on public.cases;
create policy "Users can view their own cases"
  on public.cases for select
  using (auth.uid() = user_id);

-- ── Timeline: read-only for clients ───────────────────────────────────
drop policy if exists "Users can insert timeline events on their own cases" on public.case_timeline_events;
-- ("Users can view timeline events on their own cases" from schema.sql stays.)

-- ── Messages: clients read their own, and post only as themselves ─────
drop policy if exists "Users can manage their own messages" on public.messages;
drop policy if exists "Users can view their own messages" on public.messages;
drop policy if exists "Users can send their own client messages" on public.messages;
create policy "Users can view their own messages"
  on public.messages for select
  using (auth.uid() = user_id);
create policy "Users can send their own client messages"
  on public.messages for insert
  with check (
    auth.uid() = user_id
    and from_role = 'client'
    and (
      messages.case_id is null
      or exists (select 1 from public.cases where cases.id = messages.case_id and cases.user_id = auth.uid())
    )
  );
-- No update/delete policy: message history can't be edited or erased by
-- a client (staff writes use the service role).

-- ── Documents: unchanged rights, but only linkable to the client's own case
drop policy if exists "Users can manage their own documents" on public.documents;
drop policy if exists "Users can view their own documents" on public.documents;
drop policy if exists "Users can add their own documents" on public.documents;
drop policy if exists "Users can delete their own documents" on public.documents;
create policy "Users can view their own documents"
  on public.documents for select
  using (auth.uid() = user_id);
create policy "Users can add their own documents"
  on public.documents for insert
  with check (
    auth.uid() = user_id
    and (
      documents.case_id is null
      or exists (select 1 from public.cases where cases.id = documents.case_id and cases.user_id = auth.uid())
    )
  );
create policy "Users can delete their own documents"
  on public.documents for delete
  using (auth.uid() = user_id);
