-- Storage policies for the "documents" bucket (created by
-- scripts/setup-storage.mjs). Run this once in the Supabase SQL Editor,
-- the same way as schema.sql.
--
-- Files are uploaded under a path like "<user-id>/<filename>" (see
-- lib/portal/data.ts) — these policies only let a user read/write/delete
-- objects inside their own "<user-id>/…" folder.

create policy "Users can read their own documents"
  on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload to their own folder"
  on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own documents"
  on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
