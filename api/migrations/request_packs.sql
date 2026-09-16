-- ============================================================================
-- Onboarding packs: several requests asked as one thing.
--
-- A new joiner needs proof of address, a right to work document, bank details
-- and a next of kin. Today that is four separate requests, four emails and four
-- cards in their dashboard, which is how a reasonable ask starts to feel like
-- harassment. A pack is the same four rows carrying one name, so both sides can
-- see them as one job.
--
-- Deliberately NOT a new table. They stay four independent requests: the person
-- can answer three and decline one, each grants its own scoped share, and each
-- expires on its own. The pack is only how they are presented.
-- ============================================================================
alter table public.adviser_document_requests
  add column if not exists pack_id   uuid,
  add column if not exists pack_name text;

create index if not exists adviser_document_requests_pack_idx
  on public.adviser_document_requests (pack_id) where pack_id is not null;

comment on column public.adviser_document_requests.pack_id is
  'Groups requests asked together. They stay independent: answered, declined and expired one at a time.';

-- Adding OUT columns means dropping and recreating; the grant is restated.
drop function if exists public.get_my_org_requests();

create function public.get_my_org_requests()
returns table (
  id uuid, org_id uuid, sender_name text, org_kind text,
  doc_type text, note text, expires_days integer,
  created_at timestamptz, reminded_at timestamptz,
  pack_id uuid, pack_name text
)
language sql stable security definer set search_path = public, pg_temp as $$
  select r.id, r.adviser_id, coalesce(r.sender_name, a.firm_name), a.org_kind,
         r.doc_type, r.note, r.expires_days, r.created_at, r.reminded_at,
         r.pack_id, r.pack_name
  from public.adviser_document_requests r
  join public.advisers a on a.id = r.adviser_id
  where r.status = 'requested'
    and (r.client_id = auth.uid() or r.recipient_email = auth.email())
  order by r.created_at desc
$$;
grant execute on function public.get_my_org_requests() to authenticated;
