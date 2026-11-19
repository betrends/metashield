-- First month free: a package can be in its free month ("trial") before the
-- first payment. Account recovery at no extra cost only counts packages
-- that are "active" (paid), so a free month never covers a recovery.
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check check (status in ('active', 'cancelled', 'trial'));
