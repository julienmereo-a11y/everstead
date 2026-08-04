-- Applied live to production 2026-08-04 (Supabase project uwgrzdxumhreagmuskdw).
--
-- Scheduled broadcasts: a row can now be created ahead of time (status='scheduled',
-- scheduled_at) and is picked up by api/cron/send-scheduled-broadcasts.js when due.
-- audience_emails preserves the explicit list for the 'emails' audience; sent_at
-- records when a scheduled broadcast actually went out. Existing rows default to
-- 'sent'. Status lifecycle: scheduled → sending → sent | failed, or → cancelled.
alter table public.admin_broadcasts
  add column if not exists status text not null default 'sent',
  add column if not exists scheduled_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists audience_emails jsonb;

-- The cron polls for due work; keep that lookup cheap.
create index if not exists admin_broadcasts_due_idx
  on public.admin_broadcasts (scheduled_at)
  where status = 'scheduled';
