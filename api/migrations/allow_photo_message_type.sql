-- Personal Messages: the web app has offered a 'photo' message type since 2026-06-25
-- (commit 2201a5f), but messages_type_check still only allows ('note', 'video'),
-- so saving a photo message fails with a CHECK violation. Widen the constraint.
-- Run in the Supabase SQL editor.

ALTER TABLE messages DROP CONSTRAINT messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (type IN ('note', 'video', 'photo'));
