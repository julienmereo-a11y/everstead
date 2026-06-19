-- The new first-run "Welcome to Everstead" guided onboarding shows whenever
-- profiles.onboarding_completed is false. Mark every EXISTING user as already
-- onboarded so the welcome flow only appears for brand-new signups (whose rows
-- default to false), not retroactively for established accounts.

UPDATE public.profiles
SET onboarding_completed = true
WHERE onboarding_completed IS DISTINCT FROM true;
