-- Automatic monthly payments with Paystack.
--
-- paystack_billing: one row per client who paid by card on Paystack. It
-- holds Paystack's codes for charging the saved card again. Row level
-- security is on with NO policies, so only the server (service role) can
-- read or change it — clients never see these codes.
create table if not exists public.paystack_billing (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  customer_code text,
  authorization_code text,
  card_brand text,
  card_last4 text,
  card_exp text,
  plan_id text,
  plan_code text,
  subscription_code text,
  email_token text,
  auto_renew boolean not null default false,
  next_charge_on timestamptz,
  last_failed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.paystack_billing enable row level security;
create index if not exists paystack_billing_customer_idx on public.paystack_billing (customer_code);
create index if not exists paystack_billing_subscription_idx on public.paystack_billing (subscription_code);

-- Each payment reference is processed once, even when the return page and
-- Paystack's notification arrive at the same time.
create table if not exists public.payment_events (
  reference text primary key,
  kind text not null,
  user_id uuid,
  created_at timestamptz not null default now()
);
alter table public.payment_events enable row level security;
