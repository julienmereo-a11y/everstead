-- ─────────────────────────────────────────────────────────────────────────────
-- mark_expired_trials: flips overdue Stripe-billed trials to trial_expired and
-- schedules hard deletion. Called by api/cron/trial-reminders.js (step 1).
--
-- The cron had called this RPC since launch, but the function never existed —
-- and the code's .catch() fallback threw (a PostgREST builder is a thenable
-- with no .catch), killing the whole cron. Discovered via Sentry NODE-3 on
-- 2026-08-06, the cron's first authenticated run after the CRON_SECRET outage.
--
-- The deletion date is trial end + 30 days, FLOORED at now() + 14 days: when a
-- trial is flipped late (as the backlog was), the 7-day deletion warning must
-- still have room to send before the deletion sweep — without the floor, a
-- 34-day-overdue trial would be warned and hard-deleted on the same run.
--
-- Store-billed trials (apple_iap / google_play) are excluded: Apple and Google
-- manage the trial→charge lifecycle themselves.
--
-- service_role only — this is cron machinery, not a user-facing function.
-- Applied to production 2026-08-06.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.mark_expired_trials()
returns integer
language sql
security definer
set search_path to 'public'
as $$
  with updated as (
    update profiles p
    set subscription_status   = 'trial_expired',
        scheduled_deletion_at = greatest(p.trial_ends_at + interval '30 days', now() + interval '14 days')
    where p.subscription_status = 'trialing'
      and p.trial_ends_at is not null
      and p.trial_ends_at < now()
      and (p.entitlement_source is null or p.entitlement_source not in ('apple_iap', 'google_play'))
    returning 1
  )
  select coalesce(count(*), 0)::int from updated;
$$;

revoke execute on function public.mark_expired_trials() from public, anon, authenticated;
grant execute on function public.mark_expired_trials() to service_role;
