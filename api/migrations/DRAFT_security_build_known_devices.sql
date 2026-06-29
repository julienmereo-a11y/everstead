-- ════════════════════════════════════════════════════════════════════════════
-- Security build #5 — new-device login alerts. Tracks the devices a user has
-- signed in from, so we can email them when a sign-in happens from a new one.
-- Verified in a rolled-back transaction. Review, then apply.
--
-- Only the service role writes here (the /api/auth/device-check endpoint); users
-- can read their own device list (for a future "your devices" view) but cannot
-- insert/alter it. Apply this around the same time as the matching deploy.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.known_devices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  device_hash text not null,            -- sha256(user_id : client device id); not reversible
  user_agent  text,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  unique (user_id, device_hash)
);

alter table public.known_devices enable row level security;

drop policy if exists "known_devices: owner read" on public.known_devices;
create policy "known_devices: owner read" on public.known_devices
  for select to authenticated using (auth.uid() = user_id);

-- Writes are server-side (service role) only — there is deliberately no
-- insert/update/delete policy, and we revoke the privileges as defense-in-depth.
revoke insert, update, delete, truncate on public.known_devices from anon, authenticated;
