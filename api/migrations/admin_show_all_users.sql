-- Admin panel was hiding every user without a completed Stripe subscription
-- (stripe_subscription_id is not null) — so people who have access but signed up via
-- Google or never entered a card (e.g. trialing users) were invisible. Show all real
-- (non-delegate) users. Admin-only guard + founding column preserved; CREATE OR
-- REPLACE keeps the existing (authenticated/service_role only) grants.

create or replace function public.get_user_stats_for_admin()
returns table(id uuid, full_name text, email text, phone text, country text, nationality text,
  plan text, billing_cycle text, subscription_status text,
  trial_ends_at timestamptz, current_period_end timestamptz, cancel_at timestamptz,
  stripe_customer_id text, stripe_subscription_id text, is_suspended boolean,
  is_founding_member boolean, created_at timestamptz,
  accounts_count bigint, documents_count bigint, people_count bigint,
  instructions_count bigint, wishes_count bigint, readiness_score integer)
language sql security definer set search_path = public
as $function$
  select p.id, p.full_name, p.email, p.phone, p.country, p.nationality,
    p.plan, p.billing_cycle, p.subscription_status,
    p.trial_ends_at, p.current_period_end, p.cancel_at,
    p.stripe_customer_id, p.stripe_subscription_id, p.is_suspended,
    p.is_founding_member, p.created_at,
    (select count(*) from accounts a where a.user_id = p.id),
    (select count(*) from documents d where d.user_id = p.id),
    (select count(*) from trusted_people t where t.user_id = p.id),
    (select count(*) from instructions i where i.user_id = p.id),
    (select count(*) from wishes w where w.user_id = p.id),
    p.readiness_score
  from profiles p
  where p.role != 'delegate'
    and exists (select 1 from profiles me where me.id = auth.uid() and me.role = 'admin')
  order by p.created_at desc;
$function$;
