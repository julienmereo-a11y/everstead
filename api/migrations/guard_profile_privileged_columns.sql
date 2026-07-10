-- Applied 2026-07-08. CRITICAL SECURITY FIX (live on prod immediately, independent of
-- the plan restructure).
--
-- The "profiles: update own row" RLS policy is USING (auth.uid() = id) with NO column
-- restriction. Via the normal PostgREST path (anon key + user JWT) an authenticated user
-- could therefore UPDATE their own privileged columns — verified exploitable: a plain
-- user set role='admin', subscription_status='active', plan='family', is_founding_member
-- =true on their own row. That's self-service admin promotion + free paid access, and
-- (with the new free tier) trivial cap-bypass.
--
-- Fix: a BEFORE UPDATE trigger that reverts any change to a privileged column when the
-- caller is a client (auth.role() in authenticated/anon). service_role (checkout,
-- webhooks, admin endpoints) is unaffected and still manages these columns. Silent revert
-- (not an error) so upsert-style profile saves that include a frozen column don't fail —
-- the forbidden change is ignored, legitimate fields still save.
--
-- Verified after applying: escalation attempt reverted (role/plan/status/founding all
-- unchanged) while country + full_name in the SAME update saved normally; service_role
-- can still change all columns. No client flow legitimately writes a frozen column
-- (family plan/status is set by /api/family/accept-invite via service role).
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_role text;
begin
  begin
    v_role := auth.role();
  exception when others then
    v_role := null;  -- no JWT context (postgres/internal) → trusted, allow
  end;

  if v_role in ('authenticated', 'anon') then
    new.role                          := old.role;
    new.plan                          := old.plan;
    new.billing_cycle                 := old.billing_cycle;
    new.subscription_status           := old.subscription_status;
    new.stripe_customer_id            := old.stripe_customer_id;
    new.stripe_subscription_id        := old.stripe_subscription_id;
    new.stripe_price_id               := old.stripe_price_id;
    new.trial_ends_at                 := old.trial_ends_at;
    new.cancel_at                     := old.cancel_at;
    new.current_period_end            := old.current_period_end;
    new.scheduled_deletion_at         := old.scheduled_deletion_at;
    new.is_founding_member            := old.is_founding_member;
    new.legacy_trial_access           := old.legacy_trial_access;
    new.entitlement_source            := old.entitlement_source;
    new.revenuecat_app_user_id        := old.revenuecat_app_user_id;
    new.apple_original_transaction_id := old.apple_original_transaction_id;
    new.owner_status                  := old.owner_status;
    new.is_suspended                  := old.is_suspended;
    new.adviser_id                    := old.adviser_id;
    new.last_dunning_invoice          := old.last_dunning_invoice;
    new.referred_by                   := old.referred_by;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_privileged on public.profiles;
create trigger trg_guard_profile_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();
