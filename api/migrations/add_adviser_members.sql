-- ============================================================================
-- Adviser TEAM SEATS — multiple advisers per firm (adviser-facing v1).
--
-- A firm (public.advisers) can have several adviser USERS. They all share the
-- firm's client families (profiles.adviser_id = firm). The admin seeds the firm's
-- owner; the owner invites teammates, who are auto-linked to the firm when they
-- sign up with the invited email (claim_adviser_invites).
--
-- Adviser portal access is still gated by profiles.plan = 'advisor'; claiming an
-- invite grants that.
-- ============================================================================

create table if not exists public.adviser_members (
  id            uuid primary key default gen_random_uuid(),
  adviser_id    uuid not null references public.advisers(id) on delete cascade,   -- the firm
  user_id       uuid references auth.users(id) on delete cascade,                 -- null until they sign up
  email         text not null,
  role          text not null default 'member',        -- owner | member
  invite_status text not null default 'pending',        -- pending | accepted | revoked
  invited_at    timestamptz not null default now(),
  accepted_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (adviser_id, email)
);
alter table public.adviser_members enable row level security;
create index if not exists adviser_members_user_idx  on public.adviser_members (user_id) where user_id is not null;
create index if not exists adviser_members_email_idx on public.adviser_members (lower(email));

-- Firm ids the current user is an accepted adviser of. SECURITY DEFINER so RLS
-- policies can call it without recursing on adviser_members.
create or replace function public.my_adviser_firm_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select adviser_id from public.adviser_members
  where user_id = auth.uid() and invite_status = 'accepted'
$$;

-- An adviser may read the member rows of firms they belong to (team roster).
-- All writes go through admin / owner API endpoints (service role) — no write policy.
drop policy if exists "advisers read own firm members" on public.adviser_members;
create policy "advisers read own firm members" on public.adviser_members
  for select to authenticated
  using (adviser_id in (select public.my_adviser_firm_ids()));

-- The signed-in adviser's firm (prefers the owner seat). Portal header + branding.
create or replace function public.get_adviser_firm()
returns table(id uuid, firm_name text, logo_url text, status text, max_families integer, role text)
language sql security definer stable set search_path = public as $$
  select a.id, a.firm_name, a.logo_url, a.status, a.max_families, m.role
  from public.adviser_members m
  join public.advisers a on a.id = m.adviser_id
  where m.user_id = auth.uid() and m.invite_status = 'accepted'
  order by (m.role = 'owner') desc
  limit 1
$$;

-- The firm's client families (shared pool) for the portal client list.
create or replace function public.get_adviser_clients()
returns table(id uuid, full_name text, email text, plan text, subscription_status text, readiness_score integer, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select p.id, p.full_name, p.email, p.plan, p.subscription_status, p.readiness_score, p.created_at
  from public.profiles p
  where p.adviser_id in (select public.my_adviser_firm_ids())
  order by p.readiness_score asc nulls last
$$;

-- The team roster for the caller's firm(s).
create or replace function public.get_adviser_team()
returns table(id uuid, email text, role text, invite_status text, user_id uuid, full_name text)
language sql security definer stable set search_path = public as $$
  select m.id, m.email, m.role, m.invite_status, m.user_id, p.full_name
  from public.adviser_members m
  left join public.profiles p on p.id = m.user_id
  where m.adviser_id in (select public.my_adviser_firm_ids())
  order by (m.role = 'owner') desc, m.created_at asc
$$;

-- Public, minimal firm branding (name + logo) by id — used on the family signup page
-- when they arrive via an adviser invite link. Exposes nothing sensitive.
create or replace function public.get_adviser_public(firm_id uuid)
returns table(firm_name text, logo_url text)
language sql security definer stable set search_path = public as $$
  select firm_name, logo_url from public.advisers where id = firm_id
$$;

-- Link any pending firm invites for the signed-in user's (verified) email to their
-- account and grant portal access. Safe to call on every portal load.
create or replace function public.claim_adviser_invites()
returns integer language plpgsql security definer set search_path = public as $$
declare claimed integer := 0; uemail text;
begin
  select email into uemail from auth.users where id = auth.uid();
  if uemail is null then return 0; end if;
  update public.adviser_members
    set user_id = auth.uid(), invite_status = 'accepted', accepted_at = now()
    where lower(email) = lower(uemail) and invite_status = 'pending' and user_id is null;
  get diagnostics claimed = row_count;
  if claimed > 0 then
    update public.profiles set plan = 'advisor' where id = auth.uid() and plan is distinct from 'advisor';
  end if;
  return claimed;
end $$;

revoke all on function public.get_adviser_public(uuid) from public;
grant execute on function public.my_adviser_firm_ids()   to authenticated;
grant execute on function public.get_adviser_firm()      to authenticated;
grant execute on function public.get_adviser_clients()   to authenticated;
grant execute on function public.get_adviser_team()      to authenticated;
grant execute on function public.claim_adviser_invites() to authenticated;
grant execute on function public.get_adviser_public(uuid) to authenticated, anon;
