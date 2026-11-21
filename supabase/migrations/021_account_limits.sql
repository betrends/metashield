-- Account limits per package (keep in step with src/lib/portal/account-limits.ts):
--   watch    1 Instagram + 1 Facebook
--   elite    2 Instagram + 1 Facebook + 1 Meta ad account
--   biz      3 Instagram + 3 Facebook + 3 Meta ad accounts
--   annual   2 Instagram + 2 Facebook
--   lifetime 1 Instagram + 1 Facebook + 1 Meta ad account
--   older plans (basic, professional, business, one_time): 1 Instagram + 1 Facebook
-- Without an active package or free month, no account can be saved (the
-- health check still shows the score; it just isn't kept).
-- Only NEW accounts are checked: accounts already saved are never touched
-- or deleted. Admin/server code (service role) is not limited.

create or replace function public.account_kind(p_platform text)
returns text
language sql
immutable
as $$
  select case
    when lower(p_platform) like '%instagram%' then 'instagram'
    when lower(p_platform) like '%facebook%' then 'facebook'
    when lower(p_platform) like '%meta%' then 'ads'
    else 'other'
  end
$$;

create or replace function public.package_account_limit(p_plan text, p_kind text)
returns integer
language sql
immutable
as $$
  select case
    when p_plan = 'watch'    then case p_kind when 'instagram' then 1 when 'facebook' then 1 else 0 end
    when p_plan = 'elite'    then case p_kind when 'instagram' then 2 when 'facebook' then 1 when 'ads' then 1 else 0 end
    when p_plan = 'biz'      then case p_kind when 'instagram' then 3 when 'facebook' then 3 when 'ads' then 3 else 0 end
    when p_plan = 'annual'   then case p_kind when 'instagram' then 2 when 'facebook' then 2 else 0 end
    when p_plan = 'lifetime' then case p_kind when 'instagram' then 1 when 'facebook' then 1 when 'ads' then 1 else 0 end
    when p_plan in ('basic', 'professional', 'business', 'one_time')
                             then case p_kind when 'instagram' then 1 when 'facebook' then 1 else 0 end
    else 0
  end
$$;

create or replace function public.enforce_account_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind  text := public.account_kind(new.platform);
  v_plan  text;
  v_limit integer;
  v_count integer;
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  select s.plan_id into v_plan
  from public.subscriptions s
  where s.user_id = new.user_id
    and s.status in ('active', 'trial')
    and (s.renews_on is null or s.renews_on >= current_date)
  order by s.created_at desc
  limit 1;

  if v_plan is null then
    raise exception 'ACCOUNT_LIMIT: a package is needed to save accounts'
      using errcode = 'P0001';
  end if;

  v_limit := public.package_account_limit(v_plan, v_kind);

  select count(*) into v_count
  from public.accounts a
  where a.user_id = new.user_id
    and public.account_kind(a.platform) = v_kind
    and (tg_op = 'INSERT' or a.id <> new.id);

  if v_count >= v_limit then
    raise exception 'ACCOUNT_LIMIT: package % allows % % account(s)', v_plan, v_limit, v_kind
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists accounts_enforce_limit on public.accounts;
create trigger accounts_enforce_limit
  before insert or update of platform, user_id on public.accounts
  for each row execute function public.enforce_account_limit();
