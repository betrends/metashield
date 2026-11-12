-- Admin → Email users: the email text the admin wrote is saved with each
-- send, so "try the rest again" sends exactly the same email.
alter table public.email_broadcasts add column if not exists content jsonb;
