-- ─────────────────────────────────────────────────────────────────────────────
-- Free tier: trusted people 1 -> 3 (applied to production 2026-08-25).
--
-- Acquisition, not generosity. Inviting a trusted person sends someone an email
-- about Everstead from a person they trust: it is the product's only built-in
-- word-of-mouth loop, and a cap of 1 throttled it to a single invite per free
-- member. Trusted people are database rows, so the extra two cost nothing.
--
-- Accounts and documents stay at 1: the data says nobody is hitting those caps
-- (89% of free members have never added anything), so widening them would
-- change nothing. Documents also carry real storage cost.
--
-- The database is the authority; src/config/pricing.js FREE_LIMITS mirrors it
-- for UI copy. Change both together. The three free_tier_cap_* RLS policies are
-- untouched and keep calling this function.
-- ─────────────────────────────────────────────────────────────────────────────
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
  if v_uid is null then
    return true;
  end if;

  select plan into v_plan from public.profiles where id = v_uid;

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
    v_limit := 3;
  else
    return true;
  end if;

  return v_count < v_limit;
end;
$$;
