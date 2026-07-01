-- ============================================================================
-- Adviser / solicitor FIRM management (B2B) — ADMIN SIDE ONLY.
--
-- A firm has a subscription and a family cap. Client "families" are ordinary B2C
-- owner profiles that get linked to a firm via profiles.adviser_id. Invoices are
-- recorded against a firm. Everything here is admin-managed: the new tables have
-- RLS enabled with NO public policies, so only the service-role key (used by the
-- admin API endpoints behind a requireAdmin JWT check) can read/write them.
--
-- This does NOT build the adviser-FACING dashboard. It does not touch the existing
-- (prototype, demo-only) AdvisorPortal / advisor_clients scaffolding.
--
-- Money is stored in PENNIES (integer), currency GBP.
-- ============================================================================

-- ── The firm ────────────────────────────────────────────────────────────────
create table if not exists public.advisers (
  id                  uuid primary key default gen_random_uuid(),
  firm_name           text not null,
  contact_name        text,
  contact_email       text,
  logo_url            text,                                   -- "powered by Everstead" branding
  status              text not null default 'pilot',          -- pilot | active | paused | cancelled
  plan_type           text not null default 'pilot',          -- pilot | paid
  platform_fee        integer not null default 0,             -- pennies (GBP)
  price_per_family    integer not null default 0,             -- pennies (GBP)
  max_families        integer not null default 0,             -- the cap the admin sets
  pilot_end_date      date,                                   -- for free-year pilots
  billing_start_date  date,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.advisers enable row level security;
-- No policies on purpose: service-role (admin API) only. authenticated/anon get nothing.

-- ── Link a client family (owner profile) to a firm ──────────────────────────
alter table public.profiles
  add column if not exists adviser_id uuid references public.advisers(id) on delete set null;
create index if not exists profiles_adviser_id_idx on public.profiles (adviser_id);

-- Only the service role (admin API) may set/clear a profile's adviser_id, so the
-- family cap can never be bypassed by a user editing their own profile. A normal
-- end-user's attempt to change it is silently reverted (their other edits still
-- apply). Fail-open for the admin path: we ONLY revert when the caller is clearly
-- an end user (authenticated/anon), so service_role — or an admin SQL session with
-- no JWT — is never blocked.
create or replace function public.guard_profile_adviser_id()
returns trigger language plpgsql as $$
begin
  if new.adviser_id is distinct from old.adviser_id then
    begin
      if auth.role() in ('authenticated', 'anon') then
        new.adviser_id := old.adviser_id;
      end if;
    exception when others then
      null;  -- never block an ordinary profile update if role detection ever fails
    end;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_profile_adviser_id on public.profiles;
create trigger trg_guard_profile_adviser_id
  before update on public.profiles
  for each row execute function public.guard_profile_adviser_id();

-- ── Invoices ────────────────────────────────────────────────────────────────
create table if not exists public.invoices (
  id           uuid primary key default gen_random_uuid(),
  adviser_id   uuid not null references public.advisers(id) on delete cascade,
  amount       integer not null default 0,        -- pennies (GBP); 0 = waived / free pilot
  currency     text not null default 'GBP',
  issue_date   date not null default current_date,
  due_date     date,
  status       text not null default 'unpaid',    -- paid | unpaid | waived
  file_path    text,                              -- Supabase storage path (adviser-invoices bucket)
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.invoices enable row level security;
create index if not exists invoices_adviser_id_idx on public.invoices (adviser_id, issue_date desc);
-- No policies: service-role (admin API) only.

-- ── Storage buckets for the firm's logo and invoice PDFs ────────────────────
insert into storage.buckets (id, name, public) values ('adviser-logos', 'adviser-logos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('adviser-invoices', 'adviser-invoices', false)
  on conflict (id) do nothing;

-- Admins may upload/manage objects in both buckets (client-side upload from the
-- admin panel). Logos are in a public bucket so they render anywhere; invoice PDFs
-- are private and read via short-lived signed URLs (admins only).
drop policy if exists "admins manage adviser-logos" on storage.objects;
create policy "admins manage adviser-logos" on storage.objects for all to authenticated
  using      (bucket_id = 'adviser-logos'    and (select role from public.profiles where id = auth.uid()) = 'admin')
  with check (bucket_id = 'adviser-logos'    and (select role from public.profiles where id = auth.uid()) = 'admin');

drop policy if exists "admins manage adviser-invoices" on storage.objects;
create policy "admins manage adviser-invoices" on storage.objects for all to authenticated
  using      (bucket_id = 'adviser-invoices' and (select role from public.profiles where id = auth.uid()) = 'admin')
  with check (bucket_id = 'adviser-invoices' and (select role from public.profiles where id = auth.uid()) = 'admin');
