-- Applied 2026-08-26. How many people joined Everstead through the caller's
-- referral link, for the invite cards in the app and web Settings.
--
-- Context: referred_by used to be stamped only when a referred person COMPLETED
-- A PAID CHECKOUT (Stripe metadata path), so on a freemium product the referrer
-- saw nothing for the common case. delegate-register now stamps it on free
-- signups too, and this function is how clients read the tally.
--
-- SECURITY DEFINER because RLS (correctly) stops a member reading other
-- profiles; this exposes a single aggregate and nothing else. Matches both
-- referral_code and the profile id, because older share links used the id as
-- the code and both shapes are live in the wild.
create or replace function public.my_referral_count()
returns integer
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select count(*)::int
  from public.profiles me
  join public.profiles r
    on (r.referred_by = me.referral_code or r.referred_by = me.id::text)
  where me.id = auth.uid()
    and r.id <> me.id
$$;

revoke all on function public.my_referral_count() from public, anon;
grant execute on function public.my_referral_count() to authenticated;
