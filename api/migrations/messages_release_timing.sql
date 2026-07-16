-- Personal Messages: explicit release timing. APPLIED to prod 2026-07-16.
--   after_death (default) — released when Everstead verifies the owner's passing
--                           (matches the behaviour promised since launch), or manually.
--   on_date               — auto-released by the hourly message-delivery cron once
--                           release_at arrives (external email recipients get their
--                           secure /m/<token> link, same as a manual release).
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS release_timing text NOT NULL DEFAULT 'after_death',
  ADD COLUMN IF NOT EXISTS release_at timestamptz;

ALTER TABLE messages
  ADD CONSTRAINT messages_release_timing_check CHECK (release_timing IN ('after_death', 'on_date'));
