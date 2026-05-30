-- ─────────────────────────────────────────────────────────────────────────────
-- Funnel instrumentation — "first X" timestamps stamped server-side
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds four nullable timestamptz columns to `profiles` that capture WHEN a
-- user first did each key onboarding action. Stamped automatically via
-- AFTER INSERT triggers on the source tables, so they can't be bypassed by
-- client bugs or direct DB writes.
--
-- Used for:
--   1. State-aware onboarding emails (api/cron/onboarding-sequence.js)
--   2. Funnel analytics (signup → first_account → first_contact → ... → conversion)
--      — query: see "FUNNEL QUERY" comment at the bottom of this file
--   3. First-value-moment activation analysis (which combo of actions
--      predicts 30-day retention?)
--
-- Existing data is backfilled from MIN(created_at) on each source table so
-- pre-migration users aren't treated as "blank slate".
-- ─────────────────────────────────────────────────────────────────────────────

alter table profiles
  add column if not exists first_account_added_at     timestamptz,
  add column if not exists first_contact_added_at     timestamptz,
  add column if not exists first_document_added_at    timestamptz,
  add column if not exists first_instruction_added_at timestamptz;

-- ─── Triggers ──────────────────────────────────────────────────────────────

create or replace function stamp_first_account_added() returns trigger language plpgsql security definer as $$
begin
  update profiles
     set first_account_added_at = coalesce(first_account_added_at, now())
   where id = new.user_id
     and first_account_added_at is null;
  return new;
end; $$;

create or replace function stamp_first_document_added() returns trigger language plpgsql security definer as $$
begin
  update profiles
     set first_document_added_at = coalesce(first_document_added_at, now())
   where id = new.user_id
     and first_document_added_at is null;
  return new;
end; $$;

create or replace function stamp_first_contact_added() returns trigger language plpgsql security definer as $$
begin
  update profiles
     set first_contact_added_at = coalesce(first_contact_added_at, now())
   where id = new.user_id
     and first_contact_added_at is null;
  return new;
end; $$;

create or replace function stamp_first_instruction_added() returns trigger language plpgsql security definer as $$
begin
  update profiles
     set first_instruction_added_at = coalesce(first_instruction_added_at, now())
   where id = new.user_id
     and first_instruction_added_at is null;
  return new;
end; $$;

drop trigger if exists trg_first_account_added     on accounts;
drop trigger if exists trg_first_document_added    on documents;
drop trigger if exists trg_first_contact_added     on trusted_people;
drop trigger if exists trg_first_instruction_added on instructions;

create trigger trg_first_account_added
  after insert on accounts
  for each row execute function stamp_first_account_added();

create trigger trg_first_document_added
  after insert on documents
  for each row execute function stamp_first_document_added();

create trigger trg_first_contact_added
  after insert on trusted_people
  for each row execute function stamp_first_contact_added();

create trigger trg_first_instruction_added
  after insert on instructions
  for each row execute function stamp_first_instruction_added();

-- ─── Backfill existing users ──────────────────────────────────────────────

update profiles p
   set first_account_added_at = sub.first_at
  from (select user_id, min(created_at) as first_at from accounts group by user_id) sub
 where p.id = sub.user_id and p.first_account_added_at is null;

update profiles p
   set first_document_added_at = sub.first_at
  from (select user_id, min(created_at) as first_at from documents group by user_id) sub
 where p.id = sub.user_id and p.first_document_added_at is null;

update profiles p
   set first_contact_added_at = sub.first_at
  from (select user_id, min(created_at) as first_at from trusted_people group by user_id) sub
 where p.id = sub.user_id and p.first_contact_added_at is null;

update profiles p
   set first_instruction_added_at = sub.first_at
  from (select user_id, min(created_at) as first_at from instructions group by user_id) sub
 where p.id = sub.user_id and p.first_instruction_added_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNNEL QUERY — copy-paste into Supabase SQL editor when you want a view
-- ─────────────────────────────────────────────────────────────────────────────
-- Cohort: users who created an account in the last 90 days
-- Each step is "% of cohort who reached this milestone"
--
--   with cohort as (
--     select id, created_at, trial_ends_at, stripe_subscription_id,
--            first_account_added_at, first_contact_added_at,
--            first_document_added_at, first_instruction_added_at
--       from profiles
--      where created_at >= now() - interval '90 days'
--        and role != 'delegate'
--   )
--   select
--     count(*)                                                            as signups,
--     count(stripe_subscription_id)                                       as reached_checkout,
--     count(first_account_added_at)                                       as added_account,
--     count(first_contact_added_at)                                       as added_contact,
--     count(first_document_added_at)                                      as uploaded_document,
--     count(first_instruction_added_at)                                   as wrote_instruction,
--     count(*) filter (where first_account_added_at  is not null
--                         and first_contact_added_at  is not null)        as added_account_and_contact,
--     count(*) filter (where first_contact_added_at  is not null
--                         and first_document_added_at is not null)        as activated_contact_plus_doc,
--     -- 30-day retention proxy: still has subscription 30 days after signup
--     count(*) filter (where stripe_subscription_id is not null
--                         and created_at < now() - interval '30 days')    as retained_30d
--   from cohort;
--
-- For per-user time-to-milestone analysis:
--
--   select
--     id,
--     created_at,
--     extract(epoch from (first_account_added_at  - created_at)) / 3600 as hours_to_first_account,
--     extract(epoch from (first_contact_added_at  - created_at)) / 3600 as hours_to_first_contact,
--     extract(epoch from (first_document_added_at - created_at)) / 3600 as hours_to_first_document
--   from profiles
--   where created_at >= now() - interval '90 days'
--   order by created_at desc;
