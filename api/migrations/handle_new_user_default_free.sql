-- Applied live to production 2026-07-10 (Supabase project uwgrzdxumhreagmuskdw).
--
-- Flip the signup trigger's default plan from 'essential' (retired) to 'free'.
-- A plan passed in raw_user_meta_data (the family/advisor/essential paid paths, and
-- the explicit free path) still wins; only signups with NO plan metadata now default
-- to 'free'. Free rows carry no trial: subscription_status and trial_ends_at are NULL
-- so they never show trial banners or trip trial-expiry logic. Paid rows keep
-- 'trialing' + a 14-day trial_ends_at exactly as before.
--
-- SECURITY DEFINER + `SET search_path = public` are preserved (see
-- harden_admin_invite_and_search_path.sql).
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan    text    := COALESCE(new.raw_user_meta_data->>'plan', 'free');
  v_is_free boolean := (v_plan = 'free');
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, plan, billing_cycle,
    subscription_status, trial_ends_at, phone, country, nationality
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_plan,
    COALESCE(new.raw_user_meta_data->>'billing_cycle', 'monthly'),
    CASE WHEN v_is_free THEN NULL ELSE 'trialing' END,
    CASE WHEN v_is_free THEN NULL
         ELSE COALESCE((new.raw_user_meta_data->>'trial_ends_at')::timestamptz, NOW() + INTERVAL '14 days')
    END,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'nationality'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$function$;
