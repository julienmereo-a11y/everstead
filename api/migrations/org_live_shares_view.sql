-- ============================================================================
-- "What you can see right now."
--
-- An organisation can already read its live shares through RLS on
-- member_shares, but the row only carries ids: a member_id and a resource_id.
-- Turning those into a person and a document name means reading profiles and
-- documents, and an organisation has no business selecting from either.
--
-- So the join happens here, once, behind a definer function that returns the
-- three facts the screen needs and nothing more: who, what, and the day it
-- disappears. No storage path, no file size, no other document that person
-- owns.
--
-- This is the screen that proves the promise. Every competitor can show you a
-- list of what they hold. This shows a list of what you can see, with an end
-- date on each line, and when the list is empty you are holding nothing.
-- ============================================================================

create or replace function public.get_org_live_shares(p_org_id uuid)
returns table (
  id            uuid,
  member_email  citext,
  resource_type text,
  resource_id   uuid,
  resource_name text,
  doc_type      text,
  asked_for     text,
  granted_at    timestamptz,
  expires_at    timestamptz
)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.id, p.email, s.resource_type, s.resource_id,
         d.name, d.doc_type, r.doc_type, s.granted_at, s.expires_at
  from public.member_shares s
  join public.profiles p on p.id = s.member_id
  left join public.documents d on d.id = s.resource_id and s.resource_type = 'document'
  left join public.adviser_document_requests r on r.id = s.request_id
  where s.org_id = p_org_id
    and p_org_id in (select public.my_adviser_firm_ids())
    and public.share_is_live(s.expires_at, s.revoked_at)
  order by s.expires_at asc nulls last, s.granted_at desc
$$;
grant execute on function public.get_org_live_shares(uuid) to authenticated;
