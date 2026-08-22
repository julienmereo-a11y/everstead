-- ─────────────────────────────────────────────────────────────────────────────
-- Everstead FR foundation: per-user language preference.
--
-- The marketing site's language comes from the URL (/fr/*), but the app
-- (dashboard, settings, native shell, emails) has no URL signal — it follows
-- profiles.language instead. 'en' | 'fr', default 'en'.
--
-- handle_new_user now captures raw_user_meta_data->>'language' at signup
-- (GetStarted passes the active locale), whitelisted to en/fr. Everything else
-- in the trigger is unchanged from handle_new_user_default_free.sql.
-- Applied to production 2026-08-21.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists language text not null default 'en';

alter table public.profiles
  add constraint profiles_language_check check (language in ('en', 'fr'));

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
    subscription_status, trial_ends_at, phone, country, nationality, language
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
    new.raw_user_meta_data->>'nationality',
    CASE WHEN new.raw_user_meta_data->>'language' IN ('en', 'fr')
         THEN new.raw_user_meta_data->>'language' ELSE 'en' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$function$;
