-- iOS in-app purchases via RevenueCat: adds the columns the RevenueCat webhook
-- (api/revenuecat/webhook.js) needs to join a purchase event back to a profile
-- and to avoid one payment platform's webhook clobbering state owned by the
-- other (e.g. a Stripe past_due firing right as an Apple renewal succeeds).
--
-- No new subscription_status values are introduced — RevenueCat events map onto
-- the existing plan/billing_cycle/subscription_status columns.

alter table public.profiles
  add column if not exists revenuecat_app_user_id text;

alter table public.profiles
  add column if not exists apple_original_transaction_id text;

alter table public.profiles
  add column if not exists entitlement_source text not null default 'stripe';
  -- 'stripe' | 'apple_iap' — which system currently owns/last-wrote this
  -- profile's subscription fields.

create index if not exists idx_profiles_revenuecat_app_user_id
  on public.profiles (revenuecat_app_user_id);
