-- APPLIED to prod 2026-07-16. Personal Message media: sealed photos/videos must
-- not be fetchable by anyone holding a leaked URL. The bucket becomes PRIVATE;
-- every viewer now goes through signed URLs (owner: client-side via their own
-- storage SELECT policy; external recipient: /m/<token> signs server-side;
-- delegate: the authorising api/messages/delegate-media endpoint). Write
-- policies unchanged.
drop policy if exists "messages_read_public" on storage.objects;

create policy "messages_read_own" on storage.objects for select
  using (bucket_id = 'messages' and (storage.foldername(name))[1] = (auth.uid())::text);

update storage.buckets set public = false where id = 'messages';
