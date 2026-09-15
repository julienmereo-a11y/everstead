-- ============================================================================
-- Everstead for Business, part 3: an organisation asks for one item.
--
-- adviser_document_requests was built for a firm asking a LINKED client to
-- upload something, and answering it only marked the row: the firm then read
-- the document through section consent. Neither half works for an employer.
-- An employer asks a new joiner who may not have an account yet, and an
-- employer never has section consent, so answering has to grant the access
-- rather than assume it.
--
-- Three changes, all additive:
--   1. a request can name someone by email, before they are linked;
--   2. the member reads requests addressed to their address as well as their id;
--   3. answering one creates the member_shares row, with the lifetime the
--      request asked for, and connects the organisation so the member can see
--      it (and end it) on the Who has access screen.
-- ============================================================================

alter table public.adviser_document_requests
  add column if not exists recipient_email citext,
  add column if not exists sender_name     text;

-- A request to somebody who has no account yet cannot carry a client id.
alter table public.adviser_document_requests alter column client_id drop not null;

update public.adviser_document_requests r
   set recipient_email = p.email
  from public.profiles p
 where p.id = r.client_id and r.recipient_email is null;

update public.adviser_document_requests r
   set sender_name = a.firm_name
  from public.advisers a
 where a.id = r.adviser_id and r.sender_name is null;

create index if not exists adviser_document_requests_email_idx
  on public.adviser_document_requests (recipient_email, status);

-- Read by id or by the address it was sent to, the same rule deliveries use, so
-- a request that arrived before signup is simply there afterwards.
drop policy if exists "client reads requests addressed to them" on public.adviser_document_requests;
create policy "client reads requests addressed to them" on public.adviser_document_requests
  for select to authenticated
  using (client_id = auth.uid() or recipient_email = auth.email());

-- ── Answering a request grants the access it asked for ──────────────────────
-- Previously this only stamped the row. An employer would have been told the
-- request was answered and still been unable to open anything.
create or replace function public.fulfil_document_request(p_request_id uuid, p_document_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_req   public.adviser_document_requests%rowtype;
  v_kind  text;
  v_until timestamptz;
begin
  if not exists (select 1 from public.documents d where d.id = p_document_id and d.user_id = auth.uid()) then
    raise exception 'Document not found';
  end if;

  select * into v_req from public.adviser_document_requests
   where id = p_request_id
     and status = 'requested'
     and (client_id = auth.uid() or recipient_email = auth.email());
  if not found then raise exception 'Request not found or already answered'; end if;

  -- Sharing with an organisation implies being connected to it, so the member
  -- can see it on Who has access and end it there.
  select org_kind into v_kind from public.advisers where id = v_req.adviser_id;
  insert into public.member_connections (member_id, org_id, kind, status)
  values (auth.uid(), v_req.adviser_id, coalesce(v_kind, 'professional'), 'active')
  on conflict (member_id, org_id) do update set status = 'active', ended_at = null;

  v_until := case when v_req.expires_days is null then null
                  else now() + make_interval(days => v_req.expires_days) end;

  insert into public.member_shares (member_id, org_id, resource_type, resource_id, request_id, expires_at, revoked_at)
  values (auth.uid(), v_req.adviser_id, 'document', p_document_id, p_request_id, v_until, null)
  on conflict (member_id, org_id, resource_type, resource_id)
    do update set expires_at = excluded.expires_at, revoked_at = null,
                  request_id = excluded.request_id, granted_at = now();

  update public.adviser_document_requests
     set status = 'uploaded', document_id = p_document_id, client_id = auth.uid(),
         uploaded_at = now(), updated_at = now()
   where id = p_request_id;
end $$;
revoke all on function public.fulfil_document_request(uuid, uuid) from public;
grant execute on function public.fulfil_document_request(uuid, uuid) to authenticated;

-- Declining is a first-class answer: an organisation should learn that the
-- answer is no, rather than being left to chase.
create or replace function public.decline_document_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.adviser_document_requests
     set status = 'cancelled', updated_at = now(), client_id = coalesce(client_id, auth.uid())
   where id = p_request_id
     and status = 'requested'
     and (client_id = auth.uid() or recipient_email = auth.email());
  if not found then raise exception 'Request not found or already answered'; end if;
end $$;
grant execute on function public.decline_document_request(uuid) to authenticated;

-- ── What the member's screen reads ──────────────────────────────────────────
create or replace function public.get_my_org_requests()
returns table (
  id           uuid,
  org_id       uuid,
  sender_name  text,
  org_kind     text,
  doc_type     text,
  note         text,
  expires_days integer,
  created_at   timestamptz,
  reminded_at  timestamptz
)
language sql stable security definer set search_path = public, pg_temp as $$
  select r.id, r.adviser_id, coalesce(r.sender_name, a.firm_name), a.org_kind,
         r.doc_type, r.note, r.expires_days, r.created_at, r.reminded_at
  from public.adviser_document_requests r
  join public.advisers a on a.id = r.adviser_id
  where r.status = 'requested'
    and (r.client_id = auth.uid() or r.recipient_email = auth.email())
  order by r.created_at desc
$$;
grant execute on function public.get_my_org_requests() to authenticated;
