-- In-app feedback from users (founding-50 cohort and beyond).
-- Stored for the record AND emailed to the founder in real time via /api/feedback.

create table if not exists feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,                         -- nullable: may be sent before profile resolves
  email       text,
  name        text,
  rating      smallint,                     -- 1-5 (optional)
  category    text,                         -- 'bug' | 'idea' | 'praise' | 'confusing' | 'other'
  message     text not null,
  page        text,                         -- pathname the feedback was sent from
  plan        text,
  created_at  timestamptz not null default now()
);

create index if not exists feedback_created_at_idx on feedback (created_at desc);
create index if not exists feedback_user_id_idx on feedback (user_id);

-- Service-role only (the API endpoint uses the service role key, bypasses RLS)
alter table feedback enable row level security;
