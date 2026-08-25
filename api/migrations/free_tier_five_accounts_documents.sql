-- ─────────────────────────────────────────────────────────────────────────────
-- Free tier limits raised to 5 accounts / 5 documents (applied 2026-08-25).
-- Trusted people stay at 3 (raised earlier the same day).
--
-- Julien's call: give the free plan enough room to be genuinely useful in both
-- markets. Note the earlier finding still stands, that the free tier's problem
-- is activation rather than generosity (89% of free members have never added
-- anything and none had hit the old caps), so this is unlikely to move numbers
-- on its own. It does make the plan a real product rather than a demo, which
-- matters for the France launch.
--
-- HARD limits: enforced by this SECURITY DEFINER function plus three
-- restrictive INSERT policies (free_tier_cap_* on accounts, documents and
-- trusted_people), so the cap holds no matter which client is talking to the
-- database. src/config/pricing.js FREE_LIMITS mirrors these numbers for UI copy
-- only. Change both together.
--
-- Storage note: the documents bucket caps each file at 50 MB, so the worst-case
-- footprint of a free member goes from 50 MB to 250 MB.
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
    v_limit := 5;
  elsif p_kind = 'documents' then
    select count(*) into v_count from public.documents where user_id = v_uid;
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
