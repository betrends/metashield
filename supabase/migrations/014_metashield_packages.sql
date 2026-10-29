-- MetaShield packages (October 2026): Watch, Guard, Elite, Elite Plus,
-- Annual and Lifetime. Additive and safe to run more than once.
--
-- 1. Allow the new package ids. The old plan ids stay allowed so existing
--    subscription rows (if any) remain valid.
alter table public.subscriptions drop constraint if exists subscriptions_plan_id_check;
alter table public.subscriptions
  add constraint subscriptions_plan_id_check
  check (plan_id in (
    'watch', 'guard', 'elite', 'elite_plus', 'annual', 'lifetime',
    'basic', 'professional', 'business', 'one_time'
  ));

-- 2. Packages the admin switches on after a WhatsApp/bank payment: who
--    recorded it and any note (e.g. the bank reference).
alter table public.invoices add column if not exists recorded_by text;
alter table public.invoices add column if not exists note text;
