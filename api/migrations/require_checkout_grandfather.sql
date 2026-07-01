-- Require a real checkout/card to access Everstead going forward (closes the
-- Google-sign-in bypass, where the handle_new_user trigger stamps every account
-- 'trialing' regardless of payment). ProtectedRoute now requires a Stripe
-- customer/subscription (checkout + gifts both create one) or this grandfather flag.
--
-- Grandfather existing card-free users so they finish their current trial instead of
-- being bounced to checkout.
alter table public.profiles
  add column if not exists legacy_trial_access boolean not null default false;

update public.profiles set legacy_trial_access = true
  where role is distinct from 'delegate' and stripe_customer_id is null;
