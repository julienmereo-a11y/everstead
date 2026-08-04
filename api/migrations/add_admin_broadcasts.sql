-- Applied live to production 2026-07-17 (Supabase project uwgrzdxumhreagmuskdw).
--
-- Audit log for admin broadcast emails. Written exclusively by the service-role
-- endpoint (api/admin/broadcast-email.js): RLS is enabled with NO policies, so
-- authenticated/anon clients can neither read nor write it.
create table public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  sent_by uuid references public.profiles(id) on delete set null,
  audience text not null,
  subject text not null,
  message text not null,
  recipient_count int not null default 0,
  failed_count int not null default 0,
  respect_marketing_prefs boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.admin_broadcasts enable row level security;
