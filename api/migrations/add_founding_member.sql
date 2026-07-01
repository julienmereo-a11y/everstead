-- Founding members: people who registered with the FOUNDING50 code (first year
-- free). We tag them so they get a badge of honour on their dashboard and so the
-- team can easily identify them in the admin panel.

alter table public.profiles
  add column if not exists is_founding_member boolean not null default false;

-- The admin user list comes from get_user_stats_for_admin(); surface the new flag.
-- Adding a column changes the return type, so we drop + recreate (grants are
-- re-applied by Postgres' default EXECUTE-to-PUBLIC on CREATE, matching today).
drop function if exists public.get_user_stats_for_admin();
create function public.get_user_stats_for_admin()
returns table(
  id uuid, full_name text, email text, phone text, country text, nationality text,
  plan text, billing_cycle text, subscription_status text,
  trial_ends_at timestamptz, current_period_end timestamptz, cancel_at timestamptz,
  stripe_customer_id text, stripe_subscription_id text, is_suspended boolean,
  is_founding_member boolean,
  created_at timestamptz,
  accounts_count bigint, documents_count bigint, people_count bigint,
  instructions_count bigint, wishes_count bigint, readiness_score integer
)
language sql
security definer
as $function$
  select
    p.id, p.full_name, p.email, p.phone, p.country, p.nationality,
    p.plan, p.billing_cycle, p.subscription_status,
    p.trial_ends_at, p.current_period_end, p.cancel_at,
    p.stripe_customer_id, p.stripe_subscription_id, p.is_suspended,
    p.is_founding_member,
    p.created_at,
    (select count(*) from accounts       a where a.user_id = p.id) as accounts_count,
    (select count(*) from documents      d where d.user_id = p.id) as documents_count,
    (select count(*) from trusted_people t where t.user_id = p.id) as people_count,
    (select count(*) from instructions   i where i.user_id = p.id) as instructions_count,
    (select count(*) from wishes         w where w.user_id = p.id) as wishes_count,
    p.readiness_score
  from profiles p
  where p.role != 'delegate'
    and p.stripe_subscription_id is not null
  order by p.created_at desc;
$function$;
