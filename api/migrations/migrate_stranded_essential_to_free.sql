-- Applied live to production 2026-07-10 (Supabase project uwgrzdxumhreagmuskdw).
--
-- One-time data migration accompanying the Essential retirement. Moves the STRANDED
-- Essential accounts — signed up on the now-retired plan, never entered a card, so
-- they have no real subscription — onto the permanent Free tier, where they get a
-- working (capped) account instead of a dead trial-ended screen.
--
-- Deliberately EXCLUDES every paying/grandfathered Essential subscriber: anyone with
-- a stripe_subscription_id, an active-ish status, legacy_trial_access, or an Apple IAP
-- entitlement stays exactly as they are (the plan-restructure promise). Verified before
-- and after: 31 Essential rows → 23 stranded migrated, 8 protected remain
-- (unprotected_left = 0). Existing over-cap data is retained; the Free caps only block
-- NEW inserts (free_tier_allows + restrictive INSERT policies).
UPDATE public.profiles
   SET plan = 'free',
       subscription_status = NULL,
       trial_ends_at = NULL
 WHERE plan = 'essential'
   AND stripe_subscription_id IS NULL
   AND COALESCE(subscription_status, '') NOT IN ('active', 'cancelling', 'past_due')
   AND legacy_trial_access IS NOT TRUE
   AND COALESCE(entitlement_source, '') <> 'apple_iap';
