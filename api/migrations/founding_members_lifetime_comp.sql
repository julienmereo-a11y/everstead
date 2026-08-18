-- ─────────────────────────────────────────────────────────────────────────────
-- Founding Deal correction (2026-08-18): founding members get EVERSTEAD+ FOR
-- LIFE, not "first year free". Two-part rollout:
--
--  1. This one-time update comps every founding member who has NO live Stripe
--     subscription (never subscribed, or already cancelled) straight onto
--     plan='family' / status='active'. Applied live 2026-08-18: 3 rows.
--
--  2. Founding members WITH live Stripe subscriptions are retired via Stripe:
--     the admin cancels each subscription and the webhook's founding guard
--     (api/stripe/webhook.js, customer.subscription.deleted) lands them on the
--     same comp instead of downgrading to free — and skips the winback email.
--     That guard is permanent: any future cancellation of a founding member's
--     subscription resolves to the lifetime comp.
--
-- The FOUNDING50 offer itself is now lifetime: the Stripe coupon must be
-- 100% off with duration=forever (Stripe coupons are immutable — the old
-- 1-year coupon's promotion code is archived and recreated against a new
-- forever coupon, keeping the code string FOUNDING50).
-- ─────────────────────────────────────────────────────────────────────────────

update profiles
set plan = 'family',
    subscription_status = 'active',
    stripe_subscription_id = null,
    trial_ends_at = null,
    scheduled_deletion_at = null
where is_founding_member = true
  and (stripe_subscription_id is null
       or coalesce(subscription_status, '') in ('cancelled', 'canceled'));
