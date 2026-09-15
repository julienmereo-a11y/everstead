-- ============================================================================
-- Everstead for Business, part 1: connections and deliveries.
--
-- Two structural gaps this closes.
--
--   1. A member could only ever be linked to ONE organisation
--      (profiles.adviser_id is a single column). Someone with a notaire AND an
--      employer could not exist. member_connections lifts that, without
--      touching the adviser portal: profiles.adviser_id stays the write path
--      for professional firms and mirrors itself into a connection row, so
--      every existing endpoint keeps working unchanged.
--
--   2. Data only ever flowed member → firm. A firm could ASK for a document
--      (adviser_document_requests) but never deliver one. inbound_deliveries
--      is the other direction, and it is the "send to an employee" flow.
--
-- The delivery rule that matters: a file an organisation sends lands in a
-- private staging bucket, NOT in the member's vault. It only becomes a
-- document the member owns when the member accepts it, and from that moment
-- the organisation has no access to it at all. That is what makes "a vault
-- they own and keep when they leave" literally true.
--
-- Sending is gated on advisers.can_deliver, which an admin sets once a domain
-- has been verified out of band. Pushing a file into someone's vault by email
-- address is a phishing shape, so no organisation can do it by default.
-- ============================================================================

-- ── 1. An organisation can be an employer, not only a professional firm ─────
alter table public.advisers
  add column if not exists org_kind        text    not null default 'professional',
  add column if not exists verified_domain text,
  add column if not exists can_deliver     boolean not null default false;

alter table public.advisers drop constraint if exists advisers_org_kind_check;
alter table public.advisers add constraint advisers_org_kind_check
  check (org_kind in ('professional', 'employer'));

comment on column public.advisers.can_deliver is
  'Admin-set. False until the organisation''s email domain has been verified out of band; no delivery endpoint will send without it.';

-- ── 2. A member can be connected to several organisations ───────────────────
create table if not exists public.member_connections (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.profiles(id) on delete cascade,
  org_id     uuid not null references public.advisers(id) on delete cascade,
  kind       text not null check (kind in ('professional', 'employer')),
  status     text not null default 'active' check (status in ('pending', 'active', 'ended')),
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  created_at timestamptz not null default now(),
  unique (member_id, org_id)
);
alter table public.member_connections enable row level security;
create index if not exists member_connections_member_idx on public.member_connections (member_id);
create index if not exists member_connections_org_idx    on public.member_connections (org_id);

-- Read only, both sides. A connection is created by the organisation's invite
-- (service role) or by the profile mirror below, and ended through
-- /api/org/disconnect, never by a client UPDATE: an unrestricted update would
-- let a member re-point their own row at a different firm.
drop policy if exists "member reads own connections" on public.member_connections;
create policy "member reads own connections" on public.member_connections
  for select to authenticated using (member_id = auth.uid());

drop policy if exists "org reads its connections" on public.member_connections;
create policy "org reads its connections" on public.member_connections
  for select to authenticated
  using (org_id in (select public.my_adviser_firm_ids()));

-- profiles.adviser_id remains the professional-firm write path (it is in the
-- privileged-column guard, so only the service role sets it). Mirror it, so
-- the new screens can read one table for every kind of organisation.
create or replace function public.mirror_adviser_link_to_connection()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.adviser_id is not null
     and (tg_op = 'INSERT' or new.adviser_id is distinct from old.adviser_id) then
    insert into public.member_connections (member_id, org_id, kind, status)
    values (new.id, new.adviser_id, 'professional', 'active')
    on conflict (member_id, org_id)
      do update set status = 'active', ended_at = null;
  end if;

  if tg_op = 'UPDATE' and old.adviser_id is not null
     and new.adviser_id is distinct from old.adviser_id then
    update public.member_connections
       set status = 'ended', ended_at = now()
     where member_id = new.id and org_id = old.adviser_id and kind = 'professional';
  end if;

  return new;
end $$;

drop trigger if exists trg_mirror_adviser_link on public.profiles;
create trigger trg_mirror_adviser_link
  after insert or update of adviser_id on public.profiles
  for each row execute function public.mirror_adviser_link_to_connection();

-- Backfill the links that already exist.
insert into public.member_connections (member_id, org_id, kind, status)
select p.id, p.adviser_id, 'professional', 'active'
from public.profiles p
where p.adviser_id is not null
on conflict (member_id, org_id) do nothing;

-- ── 3. Where a delivered document came from ─────────────────────────────────
-- A document an organisation sent must not eat into the free plan's allowance:
-- an employer benefit that breaks on the sixth payslip is not a benefit.
alter table public.documents
  add column if not exists source text not null default 'member';
alter table public.documents drop constraint if exists documents_source_check;
alter table public.documents add constraint documents_source_check
  check (source in ('member', 'delivery'));

create or replace function public.free_tier_allows(p_kind text)
returns boolean
language plpgsql
stable security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_plan  text;
  v_count int;
  v_limit int;
begin
  -- No JWT (service_role / internal jobs) — RLS is bypassed there anyway. Never block.
  if v_uid is null then
    return true;
  end if;

  select plan into v_plan from public.profiles where id = v_uid;

  -- ONLY the free tier is capped. Paid and grandfathered plans are unlimited.
  -- A NULL or unknown plan is treated as NOT free, so a data anomaly can never
  -- lock an existing subscriber out of their own vault.
  if v_plan is distinct from 'free' then
    return true;
  end if;

  -- Free tier hard limits (2026-08-25): 5 accounts, 5 documents, 3 trusted
  -- people. Enforced here rather than in the UI, so the cap holds regardless of
  -- which client is talking to the database.
  if p_kind = 'accounts' then
    select count(*) into v_count from public.accounts where user_id = v_uid;
    v_limit := 5;
  elsif p_kind = 'documents' then
    -- Documents an organisation delivered (source = 'delivery') do not count.
    select count(*) into v_count from public.documents
     where user_id = v_uid and source = 'member';
    v_limit := 5;
  elsif p_kind = 'trusted_people' then
    select count(*) into v_count from public.trusted_people where user_id = v_uid;
    v_limit := 3;
  else
    return true;
  end if;

  return v_count < v_limit;
end;
$$;

-- ── 4. Deliveries: an organisation sends a document to a person ─────────────
create table if not exists public.inbound_deliveries (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.advisers(id) on delete cascade,
  member_id       uuid references public.profiles(id) on delete cascade,  -- null until the recipient has an account
  recipient_email citext not null,
  title           text not null,
  doc_type        text not null default 'Other',
  note            text,
  storage_path    text not null,                       -- object in the private `deliveries` bucket
  mime_type       text,
  file_size       bigint,
  status          text not null default 'sent'
                    check (status in ('sent', 'accepted', 'declined', 'expired')),
  sent_by         uuid references public.profiles(id) on delete set null,
  claim_token     text unique,
  document_id     uuid references public.documents(id) on delete set null,
  sent_at         timestamptz not null default now(),
  responded_at    timestamptz,
  expires_at      timestamptz not null default (now() + interval '60 days')
);
alter table public.inbound_deliveries enable row level security;
create index if not exists inbound_deliveries_member_idx on public.inbound_deliveries (member_id) where status = 'sent';
create index if not exists inbound_deliveries_email_idx  on public.inbound_deliveries (recipient_email) where status = 'sent';
create index if not exists inbound_deliveries_org_idx    on public.inbound_deliveries (org_id);

-- The recipient sees what was sent to them, by user id or by the address it
-- was sent to (so a delivery that arrived before they signed up still shows).
drop policy if exists "recipient reads own deliveries" on public.inbound_deliveries;
create policy "recipient reads own deliveries" on public.inbound_deliveries
  for select to authenticated
  using (member_id = auth.uid() or recipient_email = auth.email());

-- The sending organisation sees what it sent, and whether it was accepted.
-- It never sees the document again after acceptance: document_id is a
-- reference the organisation has no read policy on.
drop policy if exists "org reads its deliveries" on public.inbound_deliveries;
create policy "org reads its deliveries" on public.inbound_deliveries
  for select to authenticated
  using (org_id in (select public.my_adviser_firm_ids()));

-- Writes go through /api/org/deliver and /api/org/delivery-respond with the
-- service role: accepting has to move a storage object, which a client cannot
-- be trusted to do, and sending has to check advisers.can_deliver.

-- ── 5. The staging bucket ───────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('deliveries', 'deliveries', false, 26214400)
on conflict (id) do nothing;

-- Objects are namespaced by organisation: deliveries/<org_id>/<uuid>.<ext>.
-- Only accepted members of that organisation may write or clear them, and
-- nobody reads them through the client: the accept path signs and copies with
-- the service role.
drop policy if exists "org writes its delivery staging" on storage.objects;
create policy "org writes its delivery staging" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'deliveries'
    and (storage.foldername(name))[1] in (select public.my_adviser_firm_ids()::text)
  );

drop policy if exists "org reads its delivery staging" on storage.objects;
create policy "org reads its delivery staging" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'deliveries'
    and (storage.foldername(name))[1] in (select public.my_adviser_firm_ids()::text)
  );

drop policy if exists "org clears its delivery staging" on storage.objects;
create policy "org clears its delivery staging" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'deliveries'
    and (storage.foldername(name))[1] in (select public.my_adviser_firm_ids()::text)
  );

-- ── 6. What the member's dashboard reads ────────────────────────────────────
-- One call for the "Who has access" screen: every organisation connected to
-- the member, with the shape the screen needs and nothing else.
create or replace function public.get_my_connections()
returns table (
  connection_id uuid,
  org_id        uuid,
  firm_name     text,
  firm_type     text,
  org_kind      text,
  logo_url      text,
  contact_email text,
  status        text,
  started_at    timestamptz
)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id, a.id, a.firm_name, a.firm_type, a.org_kind, a.logo_url, a.contact_email,
         c.status, c.started_at
  from public.member_connections c
  join public.advisers a on a.id = c.org_id
  where c.member_id = auth.uid() and c.status <> 'ended'
  order by c.started_at desc
$$;

grant execute on function public.get_my_connections() to authenticated;

-- ── 7. Follow-up (same day): who sent it, and the claim-link lookup ─────────
-- The recipient has to see WHO sent a document before accepting, and a member
-- cannot select from public.advisers (that is why get_my_adviser_firm exists).
-- Denormalise the name at send time rather than opening the firm table to every
-- recipient.
alter table public.inbound_deliveries
  add column if not exists sender_name text;

update public.inbound_deliveries d
   set sender_name = a.firm_name
  from public.advisers a
 where a.id = d.org_id and d.sender_name is null;

-- The claim link carries the capability, so this is readable without a session,
-- but it returns only what the landing page shows. Never the storage path,
-- never the recipient's address.
create or replace function public.get_delivery_by_claim_token(p_token text)
returns table (
  title text, doc_type text, note text, sender_name text,
  sent_at timestamptz, expires_at timestamptz, status text
)
language sql stable security definer set search_path = public, pg_temp as $$
  select d.title, d.doc_type, d.note, d.sender_name, d.sent_at, d.expires_at, d.status
  from public.inbound_deliveries d
  where d.claim_token = p_token and p_token is not null and length(p_token) >= 20
  limit 1
$$;

grant execute on function public.get_delivery_by_claim_token(text) to anon, authenticated;
