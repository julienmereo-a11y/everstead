-- ─────────────────────────────────────────────────────────────────────────────
-- get_user_stats_for_admin: expose `language` and `stripe_price_id` so the
-- admin panel can report French members and euro revenue correctly.
--
-- Why stripe_price_id: currency should be read from the subscription the member
-- actually holds, not inferred from their country. Inference and reality can
-- drift (a member who moved, or one whose Stripe customer was currency-locked
-- before France existed), and an MRR figure that quietly guesses is worse than
-- one that reports what Stripe charges.
--
-- Return type changes, so the function must be dropped and recreated; grants
-- are restated because CREATE hands EXECUTE to PUBLIC by default.
-- Applied to production 2026-08-25.
-- ─────────────────────────────────────────────────────────────────────────────

drop function if exists public.get_user_stats_for_admin();

create function public.get_user_stats_for_admin()
returns table(
  id uuid, full_name text, email text, phone text, country text, nationality text,
  plan text, billing_cycle text, subscription_status text,
  trial_ends_at timestamptz, current_period_end timestamptz, cancel_at timestamptz,
  stripe_customer_id text, stripe_subscription_id text, stripe_price_id text,
  is_suspended boolean, is_founding_member boolean,
  entitlement_source text, language text,
  created_at timestamptz,
  accounts_count bigint, documents_count bigint, people_count bigint,
  instructions_count bigint, wishes_count bigint,
  readiness_score integer, referral_count bigint
)
language sql
security definer
set search_path to 'public'
as $$
  select p.id, p.full_name, p.email, p.phone, p.country, p.nationality,
    p.plan, p.billing_cycle, p.subscription_status,
    p.trial_ends_at, p.current_period_end, p.cancel_at,
    p.stripe_customer_id, p.stripe_subscription_id, p.stripe_price_id,
    p.is_suspended, p.is_founding_member,
    p.entitlement_source, p.language,
    p.created_at,
    (select count(*) from accounts a where a.user_id = p.id),
    (select count(*) from documents d where d.user_id = p.id),
    (select count(*) from trusted_people t where t.user_id = p.id),
    (select count(*) from instructions i where i.user_id = p.id),
    (select count(*) from wishes w where w.user_id = p.id),
    p.readiness_score,
    (select count(*) from profiles r where p.referral_code is not null and r.referred_by = p.referral_code)
  from profiles p
  where p.role != 'delegate'
    and exists (select 1 from profiles me where me.id = auth.uid() and me.role = 'admin')
  order by p.created_at desc;
$$;

revoke execute on function public.get_user_stats_for_admin() from public, anon;
grant execute on function public.get_user_stats_for_admin() to authenticated, service_role;
