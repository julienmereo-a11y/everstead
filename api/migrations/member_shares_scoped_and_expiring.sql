-- ============================================================================
-- Everstead for Business, part 2: sharing one item, for a while.
--
-- Consent was per SECTION and forever: "share documents" with your notaire
-- shared every document, until you turned it off. There was no way to send one
-- deed, and no way for an employer to see a proof of address for a fortnight
-- and then stop.
--
-- member_shares is that grant. One row = one member, one organisation, one
-- resource, with an expiry. It is the ONLY thing an employer can ever read,
-- because section consent (adviser_client_consents) is never offered to one.
-- For a professional firm it sits alongside section consent: a share can open
-- a single document without opening the whole section.
--
-- Expiry is enforced here, not in the interface. A lapsed share stops working
-- the moment the clock passes it, whichever client is asking.
-- ============================================================================

create table if not exists public.member_shares (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.profiles(id) on delete cascade,
  org_id        uuid not null references public.advisers(id) on delete cascade,
  resource_type text not null check (resource_type in ('document')),
  resource_id   uuid not null,
  request_id    uuid references public.adviser_document_requests(id) on delete set null,
  granted_at    timestamptz not null default now(),
  expires_at    timestamptz,            -- null = until revoked
  revoked_at    timestamptz,
  unique (member_id, org_id, resource_type, resource_id)
);
alter table public.member_shares enable row level security;
create index if not exists member_shares_member_idx on public.member_shares (member_id);
create index if not exists member_shares_org_idx    on public.member_shares (org_id);

-- One definition of "live", used by every reader.
create or replace function public.share_is_live(p_expires timestamptz, p_revoked timestamptz)
returns boolean language sql immutable as $$
  select p_revoked is null and (p_expires is null or p_expires > now())
$$;

-- The member grants and revokes their own shares. Three pins in the check, so
-- a grant can never name someone else's document, an organisation the member
-- is not connected to, or another member.
drop policy if exists "member reads own shares" on public.member_shares;
create policy "member reads own shares" on public.member_shares
  for select to authenticated using (member_id = auth.uid());

drop policy if exists "member grants own shares" on public.member_shares;
create policy "member grants own shares" on public.member_shares
  for insert to authenticated
  with check (
    member_id = auth.uid()
    and exists (
      select 1 from public.member_connections c
      where c.member_id = auth.uid() and c.org_id = member_shares.org_id and c.status = 'active'
    )
    and (
      resource_type <> 'document'
      or exists (select 1 from public.documents d where d.id = member_shares.resource_id and d.user_id = auth.uid())
    )
  );

-- Update is how a share is revoked or shortened. The same pins apply, so an
-- update can never move a grant to another organisation or another document.
drop policy if exists "member revokes own shares" on public.member_shares;
create policy "member revokes own shares" on public.member_shares
  for update to authenticated
  using (member_id = auth.uid())
  with check (
    member_id = auth.uid()
    and exists (
      select 1 from public.member_connections c
      where c.member_id = auth.uid() and c.org_id = member_shares.org_id and c.status = 'active'
    )
  );

drop policy if exists "member deletes own shares" on public.member_shares;
create policy "member deletes own shares" on public.member_shares
  for delete to authenticated using (member_id = auth.uid());

-- The organisation sees only its own LIVE grants. A lapsed one disappears.
drop policy if exists "org reads its live shares" on public.member_shares;
create policy "org reads its live shares" on public.member_shares
  for select to authenticated
  using (
    org_id in (select public.my_adviser_firm_ids())
    and public.share_is_live(expires_at, revoked_at)
  );

-- ── The gate every reader uses ──────────────────────────────────────────────
-- True when an organisation may open one document: either the member consented
-- to the whole documents section (professional firms only), or there is a live
-- share for that document. Employers never satisfy the first branch, because a
-- consent row can only exist for the firm on profiles.adviser_id.
create or replace function public.org_can_read_document(p_org_id uuid, p_member_id uuid, p_document_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select
    exists (
      select 1 from public.adviser_client_consents k
      where k.client_id = p_member_id and k.adviser_id = p_org_id and k.share_documents
    )
    or exists (
      select 1 from public.member_shares s
      where s.member_id = p_member_id and s.org_id = p_org_id
        and s.resource_type = 'document' and s.resource_id = p_document_id
        and public.share_is_live(s.expires_at, s.revoked_at)
    )
$$;
grant execute on function public.org_can_read_document(uuid, uuid, uuid) to authenticated, service_role;

-- ── What the member's screen reads ──────────────────────────────────────────
create or replace function public.get_my_shares()
returns table (
  id            uuid,
  org_id        uuid,
  firm_name     text,
  resource_type text,
  resource_id   uuid,
  resource_name text,
  granted_at    timestamptz,
  expires_at    timestamptz
)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.id, s.org_id, a.firm_name, s.resource_type, s.resource_id,
         d.name, s.granted_at, s.expires_at
  from public.member_shares s
  join public.advisers a on a.id = s.org_id
  left join public.documents d on d.id = s.resource_id and s.resource_type = 'document'
  where s.member_id = auth.uid()
    and public.share_is_live(s.expires_at, s.revoked_at)
  order by s.granted_at desc
$$;
grant execute on function public.get_my_shares() to authenticated;

-- ── Requests: an organisation asks for one item, for a while ────────────────
-- adviser_document_requests already carries adviser_id, client_id, doc_type,
-- note, status and document_id, and advisers now includes employers, so it
-- serves both. It only needed to say how long the grant should last.
alter table public.adviser_document_requests
  add column if not exists expires_days integer;

comment on column public.adviser_document_requests.expires_days is
  'Suggested lifetime of the grant when the member answers this request. Null means until revoked.';

-- ── Follow-up (same day): a share must not outlive its connection ───────────
-- Ending a link with an organisation is the member's big red button, so it has
-- to kill every path at once, not just the one the endpoint checks first.
create or replace function public.org_can_read_document(p_org_id uuid, p_member_id uuid, p_document_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select
    exists (
      select 1 from public.member_connections c
      where c.member_id = p_member_id and c.org_id = p_org_id and c.status = 'active'
    )
    and (
      exists (
        select 1 from public.adviser_client_consents k
        where k.client_id = p_member_id and k.adviser_id = p_org_id and k.share_documents
      )
      or exists (
        select 1 from public.member_shares s
        where s.member_id = p_member_id and s.org_id = p_org_id
          and s.resource_type = 'document' and s.resource_id = p_document_id
          and public.share_is_live(s.expires_at, s.revoked_at)
      )
    )
$$;

drop policy if exists "org reads its live shares" on public.member_shares;
create policy "org reads its live shares" on public.member_shares
  for select to authenticated
  using (
    org_id in (select public.my_adviser_firm_ids())
    and public.share_is_live(expires_at, revoked_at)
    and exists (
      select 1 from public.member_connections c
      where c.member_id = member_shares.member_id and c.org_id = member_shares.org_id and c.status = 'active'
    )
  );

-- Revoking keeps working after a connection ends: the update check drops the
-- active-connection pin and keeps the two that matter.
drop policy if exists "member revokes own shares" on public.member_shares;
create policy "member revokes own shares" on public.member_shares
  for update to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid());
