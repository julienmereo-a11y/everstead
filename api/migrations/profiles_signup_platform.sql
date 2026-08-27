-- Applied 2026-08-27. Where each member signed up: 'web' | 'ios' | 'android'.
-- Until now there was no way to compare app and web activation, which is the
-- first question any funnel analysis asks. Stamped by handle_new_user from
-- signup metadata (whitelisted); backfill impossible, old rows stay null.
-- Full handle_new_user body updated in production; see the applied migration.
alter table public.profiles add column if not exists signup_platform text
  check (signup_platform in ('web', 'ios', 'android'));
