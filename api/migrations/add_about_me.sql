-- "About Me" — a personal one-page profile each user fills in about themselves,
-- shared with chosen trusted people (family, partners, friends, executors —
-- never solicitors/professional advisers).
--
-- One row per user (UNIQUE user_id). Recipients + timing stored inline to keep
-- v1 simple. RLS mirrors the `messages` table: a user can only read/write
-- their own row.

create table if not exists about_me (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null unique,
  full_name     text,
  date_of_birth date,
  life_events   jsonb default '[]'::jsonb,   -- [{ "year": "1985", "description": "Married in Edinburgh" }]
  passions      text,
  spotify_url   text,
  reflections   text,
  recipients    jsonb default '[]'::jsonb,   -- [trusted_people.id, ...] chosen recipients
  share_timing  text default 'on_activation' check (share_timing in ('now', 'on_activation')),
  shared_at     timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table about_me enable row level security;

create policy "users manage own about_me" on about_me
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
