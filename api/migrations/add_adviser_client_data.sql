-- Adviser portal: real client invites + persisted adviser notes.
-- (Replaces the prototype's fake-success "Invite a family" and unsaved notes.)

-- ── Client invites (firm → prospective family) ──────────────────────────────
create table if not exists public.adviser_client_invites (
  id           uuid primary key default gen_random_uuid(),
  adviser_id   uuid not null references public.advisers(id) on delete cascade,
  email        text not null,
  client_name  text,
  invited_by   uuid references auth.users(id) on delete set null,
  status       text not null default 'pending',   -- pending | accepted
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- Emails are lowercased at write time (invite-client endpoint), so a plain column
-- constraint works and supports upsert onConflict.
alter table public.adviser_client_invites
  add constraint adviser_client_invites_unique unique (adviser_id, email);
create index if not exists adviser_client_invites_email_idx
  on public.adviser_client_invites (lower(email)) where status = 'pending';
alter table public.adviser_client_invites enable row level security;
-- Reads for the firm's advisers; all writes via service role / definer RPCs.
drop policy if exists "advisers read own client invites" on public.adviser_client_invites;
create policy "advisers read own client invites" on public.adviser_client_invites
  for select to authenticated
  using (adviser_id in (select public.my_adviser_firm_ids()));

create or replace function public.get_adviser_client_invites()
returns table(id uuid, email text, client_name text, status text, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select i.id, i.email, i.client_name, i.status, i.created_at
  from public.adviser_client_invites i
  where i.adviser_id in (select public.my_adviser_firm_ids())
    and i.status = 'pending'
  order by i.created_at desc
$$;
grant execute on function public.get_adviser_client_invites() to authenticated;

-- ── Private adviser notes per client (firm-scoped) ──────────────────────────
create table if not exists public.adviser_client_notes (
  adviser_id       uuid not null references public.advisers(id) on delete cascade,
  client_id        uuid not null references public.profiles(id) on delete cascade,
  notes            text,
  next_review_date date,
  meeting_notes    text,
  updated_by       uuid,
  updated_at       timestamptz not null default now(),
  primary key (adviser_id, client_id)
);
alter table public.adviser_client_notes enable row level security;
drop policy if exists "advisers read own client notes" on public.adviser_client_notes;
create policy "advisers read own client notes" on public.adviser_client_notes
  for select to authenticated
  using (adviser_id in (select public.my_adviser_firm_ids()));

create or replace function public.get_adviser_client_notes()
returns table(client_id uuid, notes text, next_review_date date, meeting_notes text, updated_at timestamptz)
language sql security definer stable set search_path = public as $$
  select n.client_id, n.notes, n.next_review_date, n.meeting_notes, n.updated_at
  from public.adviser_client_notes n
  where n.adviser_id in (select public.my_adviser_firm_ids())
$$;
grant execute on function public.get_adviser_client_notes() to authenticated;

-- Save (upsert) a note — only for a client that belongs to the caller's firm.
create or replace function public.save_adviser_client_note(
  p_client_id uuid, p_notes text, p_next_review date, p_meeting_notes text)
returns void language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  select adviser_id into fid from public.adviser_members
    where user_id = auth.uid() and invite_status = 'accepted' limit 1;
  if fid is null then raise exception 'Not an adviser'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_client_id and p.adviser_id = fid) then
    raise exception 'This client is not linked to your firm';
  end if;
  insert into public.adviser_client_notes (adviser_id, client_id, notes, next_review_date, meeting_notes, updated_by, updated_at)
  values (fid, p_client_id, p_notes, p_next_review, p_meeting_notes, auth.uid(), now())
  on conflict (adviser_id, client_id) do update
    set notes = excluded.notes, next_review_date = excluded.next_review_date,
        meeting_notes = excluded.meeting_notes, updated_by = excluded.updated_by, updated_at = now();
end $$;
grant execute on function public.save_adviser_client_note(uuid, text, date, text) to authenticated;
