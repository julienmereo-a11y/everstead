-- Marketing leads captured from free top-of-funnel tools
-- (Estate Readiness Score, Executor Checklist, Digital Estate Calculator,
-- What to do when someone dies). These users are NOT account holders —
-- they're prospects who opted in to receive a tool result by email.
--
-- A separate table from members and from the subprocessor list because:
-- (1) different consent purpose (marketing vs operational notice)
-- (2) source attribution for downstream segmentation
-- (3) no email overlap risk with auth.users

create table if not exists marketing_leads (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  name              text,
  source            text not null,                 -- 'executor-checklist' | 'digital-estate-calculator' | 'when-someone-dies' | 'estate-readiness-score'
  source_metadata   jsonb,                          -- tool result (score, calculator answers, etc.) for personalisation
  consented         boolean not null default true,  -- opt-in checkbox state (UK GDPR)
  subscribed_at     timestamptz not null default now(),
  unsubscribed_at   timestamptz,
  unsubscribe_token text not null default replace(gen_random_uuid()::text, '-', ''),
  source_ip         text,
  user_agent        text
);

-- One row per (email, source) so we can see which tool each lead came from
create unique index if not exists marketing_leads_email_source_idx
  on marketing_leads (lower(email), source);

-- Lookup by token for unsubscribe link
create index if not exists marketing_leads_token_idx
  on marketing_leads (unsubscribe_token);

-- Filter by source for segmented campaigns
create index if not exists marketing_leads_source_idx
  on marketing_leads (source);

-- Service-role only (API endpoint uses service role key which bypasses RLS)
alter table marketing_leads enable row level security;
