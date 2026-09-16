-- ============================================================================
-- One person, more than one address.
--
-- Everything that arrives from an organisation is addressed to an email, and
-- every rule that decides whether it is yours compares that email to the one on
-- your account. That works only when the two are the same address, which is
-- exactly what an employer relationship is not: HR holds a work address, and a
-- personal estate vault is something people sign up for with a personal one.
--
-- The consequences were not symmetric. A delivery survived the mismatch,
-- because its email carries a claim token and accepting binds the row to
-- whoever is signed in. A request did not survive it at all: no token, so the
-- ask never appeared in the dashboard and the answering function refused. The
-- onboarding packs are entirely asks, so for a genuinely new joiner they were a
-- dead end.
--
-- The fix is to stop treating "the address on your account" as your identity
-- and start treating "an address you have proved you control" as your identity.
-- ============================================================================

-- ── Addresses a person has proved they control ──────────────────────────────
-- Only ever written after a code sent to that address came back, so a row here
-- is evidence rather than a claim. The primary address is NOT stored here; it
-- lives on the account and my_emails() adds it.
create table if not exists public.member_emails (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  email       extensions.citext not null unique,
  verified_at timestamptz not null default now(),
  source      text not null default 'verified',
  created_at  timestamptz not null default now()
);
alter table public.member_emails enable row level security;
create index if not exists member_emails_user_idx on public.member_emails (user_id);

drop policy if exists "member reads own addresses" on public.member_emails;
create policy "member reads own addresses" on public.member_emails
  for select to authenticated using (user_id = auth.uid());

-- Deleting is allowed and adding is not: an address gets here by proving
-- control, never by being typed into a form.
drop policy if exists "member removes own addresses" on public.member_emails;
create policy "member removes own addresses" on public.member_emails
  for delete to authenticated using (user_id = auth.uid());

-- ── Every address that is you ───────────────────────────────────────────────
-- The account address, plus any verified one. The last clause is the important
-- one: a work address handed on to the next person who holds that job must stop
-- resolving to the person who used to. Someone else's account address always
-- beats a stored alias, whatever the alias row says.
create or replace function public.my_emails()
returns setof extensions.citext
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select auth.email()::extensions.citext
  union
  select m.email from public.member_emails m
  where m.user_id = auth.uid()
    and not exists (
      select 1 from public.profiles p
      where p.id <> auth.uid() and p.email::extensions.citext = m.email
    )
$$;
grant execute on function public.my_emails() to authenticated;

create or replace function public.get_my_emails()
returns table (email extensions.citext, verified_at timestamptz, source text, is_primary boolean)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select * from (
    select auth.email()::extensions.citext as email, null::timestamptz as verified_at,
           'account'::text as source, true as is_primary
    union all
    select m.email, m.verified_at, m.source, false
    from public.member_emails m
    where m.user_id = auth.uid()
  ) q
  order by q.is_primary desc, q.verified_at desc
$$;
grant execute on function public.get_my_emails() to authenticated;

create or replace function public.remove_my_email(p_email extensions.citext)
returns void language sql security definer set search_path = public, extensions, pg_temp as $$
  delete from public.member_emails where user_id = auth.uid() and email = p_email
$$;
grant execute on function public.remove_my_email(extensions.citext) to authenticated;

-- ── Writing one, after proof ────────────────────────────────────────────────
-- Service role only, because the only caller is the endpoint that has just
-- checked a code. Control of an inbox is a present-tense fact, so proving it
-- takes the address off any account that held it before.
create or replace function public.register_verified_email(p_user_id uuid, p_email extensions.citext, p_source text default 'verified')
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if exists (select 1 from public.profiles p where p.id = p_user_id and p.email::extensions.citext = p_email) then
    return;  -- already the account address, nothing to store
  end if;
  delete from public.member_emails where email = p_email and user_id <> p_user_id;
  insert into public.member_emails (user_id, email, source)
  values (p_user_id, p_email, coalesce(p_source, 'verified'))
  on conflict (email) do update
    set user_id = excluded.user_id, verified_at = now(), source = excluded.source;
end $$;
revoke all on function public.register_verified_email(uuid, extensions.citext, text) from public, anon, authenticated;
grant execute on function public.register_verified_email(uuid, extensions.citext, text) to service_role;

-- Who is this address, for the send path. Account address first, so the rule
-- matches my_emails() from the other direction.
create or replace function public.resolve_member_by_email(p_email extensions.citext)
returns uuid
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select id from (
    select p.id, 0 as rank from public.profiles p where p.email::extensions.citext = p_email
    union all
    select m.user_id, 1 from public.member_emails m where m.email = p_email
  ) q order by rank limit 1
$$;
revoke all on function public.resolve_member_by_email(extensions.citext) from public, anon, authenticated;
grant execute on function public.resolve_member_by_email(extensions.citext) to service_role;

-- ── Codes, for proving an address ───────────────────────────────────────────
-- Service role only from end to end: the member never reads a hash and never
-- writes a row. Deliberately separate from the delivery claim code, because an
-- address is proved once and then covers everything sent to it afterwards.
create table if not exists public.email_verifications (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  email      extensions.citext not null,
  code_hash  text not null,
  expires_at timestamptz not null,
  attempts   integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, email)
);
alter table public.email_verifications enable row level security;
-- No policies at all: nothing but the service role touches this.

-- ── The swap ────────────────────────────────────────────────────────────────
drop policy if exists "recipient reads own deliveries" on public.inbound_deliveries;
create policy "recipient reads own deliveries" on public.inbound_deliveries
  for select to authenticated
  using (member_id = auth.uid() or recipient_email in (select public.my_emails()));

drop policy if exists "client reads requests addressed to them" on public.adviser_document_requests;
create policy "client reads requests addressed to them" on public.adviser_document_requests
  for select to authenticated
  using (client_id = auth.uid() or recipient_email in (select public.my_emails()));

create or replace function public.fulfil_document_request(p_request_id uuid, p_document_id uuid)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
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
     and (client_id = auth.uid() or recipient_email in (select public.my_emails()));
  if not found then raise exception 'Request not found or already answered'; end if;

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
grant execute on function public.fulfil_document_request(uuid, uuid) to authenticated;

create or replace function public.decline_document_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  update public.adviser_document_requests
     set status = 'cancelled', updated_at = now(), client_id = coalesce(client_id, auth.uid())
   where id = p_request_id
     and status = 'requested'
     and (client_id = auth.uid() or recipient_email in (select public.my_emails()));
  if not found then raise exception 'Request not found or already answered'; end if;
end $$;
grant execute on function public.decline_document_request(uuid) to authenticated;

create or replace function public.get_my_org_requests()
returns table (
  id uuid, org_id uuid, sender_name text, org_kind text, doc_type text, note text,
  expires_days integer, created_at timestamptz, reminded_at timestamptz,
  pack_id uuid, pack_name text
)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select r.id, r.adviser_id, coalesce(r.sender_name, a.firm_name), a.org_kind,
         r.doc_type, r.note, r.expires_days, r.created_at, r.reminded_at,
         r.pack_id, r.pack_name
  from public.adviser_document_requests r
  join public.advisers a on a.id = r.adviser_id
  where r.status = 'requested'
    and (r.client_id = auth.uid() or r.recipient_email in (select public.my_emails()))
  order by r.created_at desc
$$;
grant execute on function public.get_my_org_requests() to authenticated;

-- ── A request can now be pointed at, like a delivery ────────────────────────
alter table public.adviser_document_requests
  add column if not exists claim_token uuid default gen_random_uuid();
update public.adviser_document_requests set claim_token = gen_random_uuid() where claim_token is null;
create unique index if not exists adviser_document_requests_claim_token_idx
  on public.adviser_document_requests (claim_token);

-- Read by the token in the email, before sign-in, so the page can name who is
-- asking. The address is masked: enough to recognise your own, never enough to
-- learn someone else's.
create or replace function public.get_request_by_claim_token(p_token uuid)
returns table (
  sender_name    text,
  org_kind       text,
  doc_types      text[],
  pack_name      text,
  status         text,
  created_at     timestamptz,
  recipient_hint text
)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with me as (select * from public.adviser_document_requests where claim_token = p_token)
  select coalesce(me.sender_name, a.firm_name), a.org_kind,
         (select array_agg(r2.doc_type order by r2.created_at)
            from public.adviser_document_requests r2
           where r2.recipient_email = me.recipient_email
             and r2.adviser_id = me.adviser_id
             and r2.status = 'requested'
             and (me.pack_id is null or r2.pack_id = me.pack_id)),
         me.pack_name, me.status, me.created_at,
         regexp_replace(split_part(me.recipient_email::text, '@', 1), '^(.).*$', '\1')
           || repeat('•', greatest(length(split_part(me.recipient_email::text, '@', 1)) - 1, 1))
           || '@' || split_part(me.recipient_email::text, '@', 2)
  from me join public.advisers a on a.id = me.adviser_id
$$;
grant execute on function public.get_request_by_claim_token(uuid) to anon, authenticated;

-- ── Applied after testing against production ────────────────────────────────
-- Two things the fixtures caught, both caused by addresses becoming portable.

-- 1. An account can now hold several addresses, so the address ON the account
-- is no longer the address the organisation knows. Joining profiles for a
-- display name handed an employer the personal address someone signed up with,
-- which they never gave them. The row now shows the address this organisation
-- actually corresponded with. (Applied as org_sees_the_address_it_wrote_to.)

-- 2. Matching on an address is what lets something sent before you signed up be
-- waiting for you afterwards. It has to stop once the row knows who you are,
-- because addresses change hands and people do not: a work address passed to
-- the next person in the job showed them what was asked of the one who left and
-- when it was answered. The address match now applies only while the row is
-- unclaimed. (Applied as bound_rows_belong_to_the_person.)
drop policy if exists "recipient reads own deliveries" on public.inbound_deliveries;
create policy "recipient reads own deliveries" on public.inbound_deliveries
  for select to authenticated
  using (
    member_id = auth.uid()
    or (member_id is null and recipient_email in (select public.my_emails()))
  );

drop policy if exists "client reads requests addressed to them" on public.adviser_document_requests;
create policy "client reads requests addressed to them" on public.adviser_document_requests
  for select to authenticated
  using (
    client_id = auth.uid()
    or (client_id is null and recipient_email in (select public.my_emails()))
  );

-- get_my_org_requests, fulfil_document_request and decline_document_request
-- carry the same "unclaimed only" clause; see the applied migration of that
-- name for their full bodies.
