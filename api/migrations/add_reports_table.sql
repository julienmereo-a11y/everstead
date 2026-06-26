-- Death / incapacity reports submitted by delegates from the Delegate Dashboard.
-- Previously this flow was a front-end demo stub (lib/demoData.submitReport) that
-- persisted nothing and sent no email. api/reports/submit.js now writes here and
-- emails both the team (to verify) and the reporter (a UK "what to do" guide on death).
--
-- RLS is enabled with NO policies on purpose: only the service role (the serverless
-- endpoint, and later the admin panel via a service-role API) can read or write.

create table if not exists public.reports (
  id                uuid primary key default gen_random_uuid(),
  type              text not null default 'death',   -- 'death' | 'incident'
  status            text not null default 'pending', -- 'pending' | 'verified' | 'rejected'
  owner_id          uuid references auth.users(id) on delete set null,
  owner_name        text,
  owner_email       text,
  owner_plan        text,
  reporter_name     text,
  reporter_email    text,
  reporter_phone    text,
  reporter_role     text,
  relationship      text,
  date_of_death     text,
  place_of_death    text,
  death_cert_number text,
  incident_type     text,
  incident_date     text,
  location          text,
  notes             text,
  details           jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.reports enable row level security;

create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- Owner lifecycle status, set by /api/admin/reports when an admin verifies a report
-- (death → 'deceased', incapacity → 'incapacitated'). The Delegate Dashboard reads
-- profiles.owner_status to reflect the passing and auto-release sealed messages.
alter table public.profiles
  add column if not exists owner_status text not null default 'active';
