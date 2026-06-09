-- Add a profile picture to About Me.
-- Stores the public URL on the about_me row; the image lives in a public
-- `avatars` storage bucket, namespaced by user id so each user only writes
-- their own folder.

-- 1. Column on about_me
alter table about_me add column if not exists avatar_url text;

-- 2. Public storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. Storage policies — users manage only their own folder ({user_id}/…),
--    anyone can read (bucket is public, profile pics aren't secret).
drop policy if exists "avatars read"        on storage.objects;
drop policy if exists "avatars insert own"  on storage.objects;
drop policy if exists "avatars update own"  on storage.objects;
drop policy if exists "avatars delete own"  on storage.objects;

create policy "avatars read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
