-- Applied 2026-07-13 (plan restructure — server-side backstop for Personal Messages).
--
-- Personal Messages ("sealed letters") is an Everstead+ (internal key 'family') /
-- Everstead Pro ('advisor') feature. The web and native apps gate it in the UI via
-- PLANS[plan].limits.personalMessages (true only for family/advisor), but until now
-- there was NO server-side enforcement: a free or grandfathered 'essential' user could
-- insert into `messages` via the raw API. This adds that backstop.
--
-- Mirrors the free_tier_plan_and_caps.sql pattern: a SECURITY DEFINER checker + a
-- RESTRICTIVE INSERT policy that ANDs with the existing permissive owner policy.
-- Only INSERT is restricted — SELECT/UPDATE/DELETE stay ownership-only, so a user who
-- downgrades keeps full access to (and can still release/delete) messages they already
-- created.
--
-- Verified against live data before shipping (2026-07-13):
--   free: 26 users / 0 messages,  essential: 8 / 0   → blocked from new inserts
--   family: 15 / 2 messages,      advisor: 1 / 0      → unaffected, still allowed
--   no NULL/unknown plans exist.

create or replace function public.plan_allows_messages()
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_plan text;
begin
  -- No JWT (service_role / internal jobs) — RLS is bypassed there anyway. Never block.
  if v_uid is null then
    return true;
  end if;

  select plan into v_plan from public.profiles where id = v_uid;

  -- Block ONLY the plans that explicitly exclude Personal Messages: the free tier and the
  -- retired 'essential'. Everstead+ ('family') / Everstead Pro ('advisor') pass, and so
  -- does any NULL/unknown plan — a data anomaly must never lock a real subscriber out of a
  -- feature (mirrors free_tier_allows()'s fail-open philosophy).
  return coalesce(v_plan, '') not in ('free', 'essential');
end;
$$;

revoke execute on function public.plan_allows_messages() from public, anon;
grant  execute on function public.plan_allows_messages() to authenticated, service_role;

-- RESTRICTIVE INSERT policy — ANDs with the permissive "users manage own messages"
-- (ownership) policy, adding the plan requirement only for INSERT.
drop policy if exists messages_require_plus on public.messages;
create policy messages_require_plus on public.messages
  as restrictive for insert to authenticated
  with check (public.plan_allows_messages());
