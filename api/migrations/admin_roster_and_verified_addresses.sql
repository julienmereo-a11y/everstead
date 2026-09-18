-- Two admin-panel reads that did not exist.
--
-- 1. get_admin_roster(): the Team tab said it read profiles.role = 'admin' and
--    read nothing, so the roster was empty outside demo mode. This returns who
--    holds the role and whether each has an authenticator enrolled, which is
--    the one thing the panel requires of an admin session and the one thing
--    the operator could not see.
--
-- 2. get_user_stats_for_admin(): an account can hold several verified
--    addresses (member_emails), and an organisation addresses everything to
--    one of them. The admin search matched profiles.email only, so a member
--    looked up by the work address a firm gave us was "not found". The row now
--    carries the extra addresses; the panel searches and shows them. The
--    return type changes, so the function is dropped and recreated.
--
-- Both are SECURITY DEFINER and gate on the caller holding the admin role,
-- like the function they extend. EXECUTE is revoked from public and anon.

create or replace function public.get_admin_roster()
returns table(id uuid, full_name text, email text, created_at timestamptz, mfa_enrolled boolean)
language sql
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.email, p.created_at,
         exists (
           select 1 from auth.mfa_factors f
           where f.user_id = p.id and f.status = 'verified'
         ) as mfa_enrolled
  from public.profiles p
  where p.role = 'admin'
    and exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'admin')
  order by p.created_at asc;
$$;
revoke execute on function public.get_admin_roster() from public, anon;
grant execute on function public.get_admin_roster() to authenticated;

drop function if exists public.get_user_stats_for_admin();
create function public.get_user_stats_for_admin()
returns table(
  id uuid, full_name text, email text, phone text, country text, nationality text,
  plan text, billing_cycle text, subscription_status text,
  trial_ends_at timestamptz, current_period_end timestamptz, cancel_at timestamptz,
  stripe_customer_id text, stripe_subscription_id text, stripe_price_id text,
  is_suspended boolean, is_founding_member boolean, entitlement_source text, language text,
  created_at timestamptz,
  accounts_count bigint, documents_count bigint, people_count bigint,
  instructions_count bigint, wishes_count bigint,
  readiness_score integer, referral_count bigint,
  emails text[]
)
language sql
security definer
set search_path = public
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
    (select count(*) from profiles r where p.referral_code is not null and r.referred_by = p.referral_code),
    -- The addresses proved from Settings or a claim link, minus the sign-in one.
    coalesce((
      select array_agg(e.email::text order by e.verified_at)
      from public.member_emails e
      where e.user_id = p.id
        and lower(e.email::text) <> lower(coalesce(p.email, ''))
    ), '{}'::text[])
  from profiles p
  where p.role != 'delegate'
    and exists (select 1 from profiles me where me.id = auth.uid() and me.role = 'admin')
  order by p.created_at desc;
$$;
revoke execute on function public.get_user_stats_for_admin() from public, anon;
grant execute on function public.get_user_stats_for_admin() to authenticated;
