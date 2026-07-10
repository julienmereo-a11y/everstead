-- Applied 2026-07-08 (plan restructure). Record of the live migration.
--
-- FREE TIER: allow plan='free' and enforce its caps in the database.
--
-- INERT for every existing user: nobody has plan='free' yet, and free_tier_allows()
-- returns TRUE for any plan that is not exactly 'free' (including NULL/unknown), so
-- current essential / family / advisor subscribers are completely unaffected.
--
-- Verified before shipping (synthetic users, real RLS via impersonated JWT):
--   • paid 'family' user   → inserted 3 accounts freely (unaffected)
--   • free user            → 1st account/document/trusted-person allowed
--   • free user            → 2nd of each blocked by free_tier_cap_* RLS policy
--
-- Limits are mirrored in src/config/pricing.js (FREE_LIMITS) for UI copy only.
-- The database is the authority. Change both together.

-- 1. Widen the plan check (purely additive).
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan = any (array['free'::text, 'essential'::text, 'family'::text, 'advisor'::text]));

-- 2. Cap checker. SECURITY DEFINER so the row counts bypass RLS (a plain subquery on
--    the same table inside its own policy would re-enter the policy).
create or replace function public.free_tier_allows(p_kind text)
returns boolean
language plpgsql
security definer
stable
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

  -- ONLY the free tier is capped. Paid and grandfathered plans are unlimited, exactly
  -- as they are today. A NULL or unknown plan is treated as NOT free, so a data anomaly
  -- can never lock an existing subscriber out of their own vault.
  if v_plan is distinct from 'free' then
    return true;
  end if;

  if p_kind = 'accounts' then
    select count(*) into v_count from public.accounts where user_id = v_uid;
    v_limit := 1;
  elsif p_kind = 'documents' then
    select count(*) into v_count from public.documents where user_id = v_uid;
    v_limit := 1;
  elsif p_kind = 'trusted_people' then
    select count(*) into v_count from public.trusted_people where user_id = v_uid;
    v_limit := 1;
  else
    return true;
  end if;

  return v_count < v_limit;
end;
$$;

revoke execute on function public.free_tier_allows(text) from public, anon;
grant  execute on function public.free_tier_allows(text) to authenticated, service_role;

-- 3. RESTRICTIVE INSERT policies. Restrictive policies AND with the existing permissive
--    "owner" policies, so ownership is still required — we only add the cap on top, and
--    only for INSERT (SELECT/UPDATE/DELETE are untouched).
drop policy if exists free_tier_cap_accounts       on public.accounts;
drop policy if exists free_tier_cap_documents      on public.documents;
drop policy if exists free_tier_cap_trusted_people on public.trusted_people;

create policy free_tier_cap_accounts on public.accounts
  as restrictive for insert to authenticated
  with check (public.free_tier_allows('accounts'));

create policy free_tier_cap_documents on public.documents
  as restrictive for insert to authenticated
  with check (public.free_tier_allows('documents'));

create policy free_tier_cap_trusted_people on public.trusted_people
  as restrictive for insert to authenticated
  with check (public.free_tier_allows('trusted_people'));
