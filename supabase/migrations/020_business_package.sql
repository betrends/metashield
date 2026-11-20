-- MetaShield Business (₦50,000/month), stored as plan id 'biz' (the old,
-- retired 'business' plan id stays allowed for existing rows).
alter table public.subscriptions drop constraint if exists subscriptions_plan_id_check;
alter table public.subscriptions
  add constraint subscriptions_plan_id_check
  check (plan_id in (
    'watch', 'elite', 'biz', 'annual', 'lifetime',
    'basic', 'professional', 'business', 'one_time'
  ));
