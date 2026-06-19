-- Show the first-run "Welcome to Everstead" guided onboarding to ALL existing
-- users (not just new signups) so everyone is introduced to the new About Me
-- feature. Resets onboarding_completed = false for every non-delegate user; it
-- flips back to true once each user dismisses/completes the welcome, so it's a
-- one-time announcement per user. Delegates are excluded (they don't see it).

UPDATE public.profiles
SET onboarding_completed = false
WHERE role IS DISTINCT FROM 'delegate';
