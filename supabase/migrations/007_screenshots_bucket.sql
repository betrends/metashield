-- Public storage bucket for error screenshots uploaded via the eligibility wizard
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

-- Allow anyone to upload (wizard is used by anonymous visitors)
create policy "Anyone can upload screenshots"
  on storage.objects for insert
  with check (bucket_id = 'screenshots');

-- Allow public read
create policy "Screenshots are publicly readable"
  on storage.objects for select
  using (bucket_id = 'screenshots');
