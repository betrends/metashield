-- Admin → Email users: allow emails the admin pastes in (people not on the
-- platform) as recipients, marked kind = 'contact'.
alter table public.email_broadcast_recipients drop constraint if exists email_broadcast_recipients_kind_check;
alter table public.email_broadcast_recipients
  add constraint email_broadcast_recipients_kind_check check (kind in ('client', 'lead', 'contact'));
