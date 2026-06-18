-- Adds a per-user master switch for ALL AI features (default ON).
-- When false, the client hides every AI entry point AND every AI Edge Function
-- refuses to run for that user — so no document or text is ever sent to the AI
-- provider. RLS already lets a user update their own profile row, so the
-- Settings toggle (updateProfile) works without any new policy.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_features_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.ai_features_enabled IS
  'Master switch for all AI-powered features. When false, no user data is sent to the AI provider (enforced client-side and in every AI Edge Function).';
