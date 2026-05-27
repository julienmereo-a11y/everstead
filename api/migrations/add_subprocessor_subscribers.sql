-- Subprocessor notification subscribers
-- Anyone (member or not) can subscribe to be notified when Everstead
-- adds or replaces a subprocessor. Required for UK GDPR Art. 28 — Advisers
-- need a way to learn about subprocessor changes before they take effect.

create table if not exists subprocessor_notification_subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  subscribed_at     timestamptz not null default now(),
  unsubscribed_at   timestamptz,
  unsubscribe_token text not null default replace(gen_random_uuid()::text, '-', ''),
  source_ip         text,
  user_agent        text
);

-- One active subscription per email. Allow re-subscribe after unsubscribe.
create unique index if not exists subprocessor_subscribers_active_email_idx
  on subprocessor_notification_subscribers (lower(email))
  where unsubscribed_at is null;

-- Lookup by token for unsubscribe link
create index if not exists subprocessor_subscribers_token_idx
  on subprocessor_notification_subscribers (unsubscribe_token);

-- Read access is service-role only (no end-user reads)
alter table subprocessor_notification_subscribers enable row level security;

-- No policies = no anon/authenticated access. The API endpoint uses the
-- service role key which bypasses RLS.
