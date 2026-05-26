-- Migration: rate limiting table + marketing email preference
-- Run once in Supabase SQL editor
-- Created: 2026-05-26

-- Rate limit log — tracks requests per IP per endpoint.
-- Used by delegate-register to block rapid account creation.
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id         BIGSERIAL    PRIMARY KEY,
  ip         TEXT         NOT NULL,
  endpoint   TEXT         NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limit_log_lookup_idx
  ON rate_limit_log (ip, endpoint, created_at);

-- Auto-purge rows older than 1 hour (keeps table tiny).
-- Supabase doesn't support pg_cron on free plans, so this is a plain
-- function — call it from the daily cron or run manually.
CREATE OR REPLACE FUNCTION cleanup_rate_limit_log()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM rate_limit_log WHERE created_at < now() - interval '1 hour';
$$;

-- Marketing email opt-out flag on profiles.
-- FALSE = user has unsubscribed from non-transactional emails.
-- Transactional emails (payment, trial reminders, deletion warnings)
-- are always sent regardless of this flag.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS marketing_emails_enabled BOOLEAN DEFAULT TRUE;
