-- ============================================================================
-- Adviser pilot, part 1 of 3: the client decides what their firm sees.
--
-- Until now a linked client (profiles.adviser_id) gave the firm nothing beyond
-- their name and readiness score: the portal's "what the client shares with
-- you" screen was demo-only. This migration makes it real.
--
--   • advisers.firm_type          drives the label in the client's vault
--                                 ("Your solicitor", "Votre notaire", ...)
--   • adviser_client_consents     one row per client: which sections the firm
--                                 may read, and whether the firm is told when
--                                 the vault is activated after a verified
--                                 death or incapacity report
--   • get_my_adviser_firm()       the client reads their own firm's name/logo
--   • get_adviser_client_plan()   the firm reads ONLY the consented sections
--   • get_adviser_clients()       now also returns owner_status, so the portal
--                                 can show an activated vault
--
-- The consent row is written by the client through PostgREST under RLS; the
-- with_check pins adviser_id to the firm the profile is actually linked to, so
-- nobody can grant access to an arbitrary firm. The reader RPC re-checks the
-- link at read time, so an unlinked client stops sharing immediately even if
-- their stale consent row remains.
-- ============================================================================

alter table public.advisers
  add column if not exists firm_type text;   -- solicitor | notaire | ifa | accountant | wealth | other

create table if not exists public.adviser_client_consents (
  client_id            uuid primary key references public.profiles(id) on delete cascade,
  adviser_id           uuid not null references public.advisers(id) on delete cascade,
  share_accounts       boolean not null default false,
  share_documents      boolean not null default false,
  share_instructions   boolean not null default false,
  share_people         boolean not null default false,
  share_alerts         boolean not null default false,
  notify_on_activation boolean not null default false,
  updated_at           timestamptz not null default now()
);
alter table public.adviser_client_consents enable row level security;
create index if not exists adviser_client_consents_adviser_idx on public.adviser_client_consents (adviser_id);

drop policy if exists "client manages own adviser consent" on public.adviser_client_consents;
create policy "client manages own adviser consent" on public.adviser_client_consents
  for all to authenticated
  using (client_id = auth.uid())
  with check (
    client_id = auth.uid()
    and adviser_id = (select p.adviser_id from public.profiles p where p.id = auth.uid())
  );

drop policy if exists "advisers read consents of their clients" on public.adviser_client_consents;
create policy "advisers read consents of their clients" on public.adviser_client_consents
  for select to authenticated
  using (adviser_id in (select public.my_adviser_firm_ids()));

create or replace function public.adviser_client_consents_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_adviser_client_consents_touch on public.adviser_client_consents;
create trigger trg_adviser_client_consents_touch
  before update on public.adviser_client_consents
  for each row execute function public.adviser_client_consents_touch();

-- ── The client's view of their firm ─────────────────────────────────────────
create or replace function public.get_my_adviser_firm()
returns table(id uuid, firm_name text, firm_type text, logo_url text, contact_name text, contact_email text)
language sql security definer stable set search_path = public as $$
  select a.id, a.firm_name, a.firm_type, a.logo_url, a.contact_name, a.contact_email
  from public.profiles p
  join public.advisers a on a.id = p.adviser_id
  where p.id = auth.uid()
$$;
revoke all on function public.get_my_adviser_firm() from public;
grant execute on function public.get_my_adviser_firm() to authenticated;

-- ── The firm's view of one client: consented sections only ──────────────────
create or replace function public.get_adviser_client_plan(p_client_id uuid)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  fid uuid;
  c   public.adviser_client_consents%rowtype;
  share_any boolean;
  activity_types text[] := array[]::text[];
begin
  select p.adviser_id into fid from public.profiles p where p.id = p_client_id;
  if fid is null or fid not in (select public.my_adviser_firm_ids()) then
    raise exception 'This client is not linked to your firm';
  end if;

  select * into c from public.adviser_client_consents
    where client_id = p_client_id and adviser_id = fid;
  -- No row yet means nothing is shared (all flags read as false below).

  if coalesce(c.share_accounts, false)     then activity_types := activity_types || 'accounts'; end if;
  if coalesce(c.share_documents, false)    then activity_types := activity_types || 'documents'; end if;
  if coalesce(c.share_instructions, false) then activity_types := activity_types || 'instructions'; end if;
  if coalesce(c.share_people, false)       then activity_types := activity_types || 'trusted_people'; end if;
  share_any := cardinality(activity_types) > 0;

  return jsonb_build_object(
    'consents', jsonb_build_object(
      'accounts',             coalesce(c.share_accounts, false),
      'documents',            coalesce(c.share_documents, false),
      'instructions',         coalesce(c.share_instructions, false),
      'people',               coalesce(c.share_people, false),
      'alerts',               coalesce(c.share_alerts, false),
      'notify_on_activation', coalesce(c.notify_on_activation, false),
      'updated_at',           c.updated_at
    ),
    'owner', (
      select jsonb_build_object(
        'id', p.id, 'full_name', p.full_name, 'email', p.email, 'country', p.country,
        'language', p.language, 'owner_status', p.owner_status, 'readiness_score', p.readiness_score)
      from public.profiles p where p.id = p_client_id
    ),
    'activation', (
      select jsonb_build_object('type', r.type, 'verified_at', r.updated_at, 'date_of_death', r.date_of_death)
      from public.reports r
      where r.owner_id = p_client_id and r.status = 'verified'
      order by r.updated_at desc limit 1
    ),
    'accounts', case when coalesce(c.share_accounts, false) then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id, 'institution', a.institution, 'account_type', a.account_type, 'category', a.category,
        'account_number_hint', a.account_number_hint, 'balance_display', a.balance_display,
        'status', a.status, 'notes', a.notes, 'updated_at', a.updated_at)
        order by a.sort_order nulls last, a.created_at), '[]'::jsonb)
      from public.accounts a where a.user_id = p_client_id
    ) else '[]'::jsonb end,
    'documents', case when coalesce(c.share_documents, false) then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', d.id, 'name', d.name, 'doc_type', d.doc_type, 'status', d.status, 'expires_at', d.expires_at,
        'file_size', d.file_size, 'mime_type', d.mime_type, 'notes', d.notes, 'updated_at', d.updated_at,
        'has_file', d.storage_path is not null)
        order by d.updated_at desc), '[]'::jsonb)
      from public.documents d where d.user_id = p_client_id
    ) else '[]'::jsonb end,
    'instructions', case when coalesce(c.share_instructions, false) then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id, 'title', i.title, 'category', i.category, 'audience', i.audience, 'body', i.body,
        'updated_at', i.updated_at,
        'steps', (select coalesce(jsonb_agg(s.body order by s.step_order), '[]'::jsonb)
                  from public.instruction_steps s where s.instruction_id = i.id))
        order by i.sort_order nulls last, i.created_at), '[]'::jsonb)
      from public.instructions i where i.user_id = p_client_id
    ) else '[]'::jsonb end,
    'trusted_people', case when coalesce(c.share_people, false) then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name, 'role', t.role, 'email', t.email, 'invite_status', t.invite_status)
        order by t.created_at), '[]'::jsonb)
      from public.trusted_people t where t.user_id = p_client_id
    ) else '[]'::jsonb end,
    'alerts', case when coalesce(c.share_alerts, false) then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', al.id, 'severity', al.severity, 'title', al.title, 'detail', al.detail,
        'category', al.category, 'is_read', al.is_read, 'created_at', al.created_at)
        order by al.is_read, al.created_at desc), '[]'::jsonb)
      from (select * from public.alerts where user_id = p_client_id order by is_read, created_at desc limit 50) al
    ) else '[]'::jsonb end,
    'activity', case when share_any then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', l.id, 'action', l.action, 'resource_type', l.resource_type,
        'resource_name', l.resource_name, 'created_at', l.created_at)
        order by l.created_at desc), '[]'::jsonb)
      from (select * from public.activity_log
            where user_id = p_client_id and resource_type = any(activity_types)
            order by created_at desc limit 25) l
    ) else '[]'::jsonb end
  );
end $$;
revoke all on function public.get_adviser_client_plan(uuid) from public;
grant execute on function public.get_adviser_client_plan(uuid) to authenticated;

-- ── Client list now carries owner_status (return type changes: drop first) ──
drop function if exists public.get_adviser_clients();
create function public.get_adviser_clients()
returns table(id uuid, full_name text, email text, plan text, subscription_status text,
              readiness_score integer, created_at timestamptz, owner_status text, language text)
language sql security definer stable set search_path = public as $$
  select p.id, p.full_name, p.email, p.plan, p.subscription_status, p.readiness_score, p.created_at,
         p.owner_status, p.language
  from public.profiles p
  where p.adviser_id in (select public.my_adviser_firm_ids())
  order by p.readiness_score asc nulls last
$$;
revoke all on function public.get_adviser_clients() from public;
grant execute on function public.get_adviser_clients() to authenticated;
