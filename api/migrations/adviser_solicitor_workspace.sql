-- ============================================================================
-- Adviser pilot, part 2 of 3: the solicitor experience (Adviser Portal v2).
--
-- A solicitor firm needs three things a financial adviser does not: a review
-- queue for drafts and signed copies, a way to ask a client for a document,
-- and matter tracking for estate-plan and probate work. All three are FIRM-side
-- records: nothing here ever modifies the client's own rows, and every reader
-- and writer re-checks the firm link (profiles.adviser_id) and, for anything
-- touching documents, the client's documents consent.
--
--   • set_firm_type()                 the owner switches the firm between
--                                     solicitor and financial adviser
--   • adviser_document_requests       "please upload X" prompts to a client
--   • adviser_document_reviews        draft / in review / signed / stored, on
--                                     the firm's copy of the record only
--   • adviser_matters                 estate-plan and probate progress
--   • get_adviser_workspace()         the firm reads all three in one call
--   • fulfil_document_request()       the client attaches an uploaded document
-- ============================================================================

-- ── Firm role ───────────────────────────────────────────────────────────────
create or replace function public.set_firm_type(p_type text)
returns void language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if p_type not in ('solicitor', 'notaire', 'ifa', 'accountant', 'wealth', 'other') then
    raise exception 'Unknown firm type';
  end if;
  select adviser_id into fid from public.adviser_members
    where user_id = auth.uid() and role = 'owner' and invite_status = 'accepted' limit 1;
  if fid is null then raise exception 'Only a firm owner can change the firm type'; end if;
  update public.advisers set firm_type = p_type, updated_at = now() where id = fid;
end $$;
revoke all on function public.set_firm_type(text) from public;
grant execute on function public.set_firm_type(text) to authenticated;

-- get_adviser_firm() now also returns the type and plan facts the portal shows.
drop function if exists public.get_adviser_firm();
create function public.get_adviser_firm()
returns table(id uuid, firm_name text, logo_url text, status text, max_families integer, role text,
              firm_type text, plan_type text, pilot_end_date date, contact_email text)
language sql security definer stable set search_path = public as $$
  select a.id, a.firm_name, a.logo_url, a.status, a.max_families, m.role,
         a.firm_type, a.plan_type, a.pilot_end_date, a.contact_email
  from public.adviser_members m
  join public.advisers a on a.id = m.adviser_id
  where m.user_id = auth.uid() and m.invite_status = 'accepted'
  order by (m.role = 'owner') desc
  limit 1
$$;
revoke all on function public.get_adviser_firm() from public;
grant execute on function public.get_adviser_firm() to authenticated;

-- The caller's firm for a linked client, or an exception. Used by every writer.
create or replace function public.adviser_firm_for_client(p_client_id uuid)
returns uuid language plpgsql security definer stable set search_path = public as $$
declare fid uuid;
begin
  select p.adviser_id into fid from public.profiles p where p.id = p_client_id;
  if fid is null or fid not in (select public.my_adviser_firm_ids()) then
    raise exception 'This client is not linked to your firm';
  end if;
  return fid;
end $$;
revoke all on function public.adviser_firm_for_client(uuid) from public;
grant execute on function public.adviser_firm_for_client(uuid) to authenticated;

-- ── Document requests ───────────────────────────────────────────────────────
create table if not exists public.adviser_document_requests (
  id            uuid primary key default gen_random_uuid(),
  adviser_id    uuid not null references public.advisers(id) on delete cascade,
  client_id     uuid not null references public.profiles(id) on delete cascade,
  requested_by  uuid references auth.users(id) on delete set null,
  doc_type      text not null,
  note          text,
  status        text not null default 'requested'
                check (status in ('requested', 'uploaded', 'reviewed', 'stored', 'cancelled')),
  document_id   uuid references public.documents(id) on delete set null,
  created_at    timestamptz not null default now(),
  reminded_at   timestamptz,
  uploaded_at   timestamptz,
  updated_at    timestamptz not null default now()
);
alter table public.adviser_document_requests enable row level security;
create index if not exists adviser_document_requests_firm_idx   on public.adviser_document_requests (adviser_id, status);
create index if not exists adviser_document_requests_client_idx on public.adviser_document_requests (client_id, status);

drop policy if exists "firm reads its document requests" on public.adviser_document_requests;
create policy "firm reads its document requests" on public.adviser_document_requests
  for select to authenticated using (adviser_id in (select public.my_adviser_firm_ids()));
drop policy if exists "client reads requests addressed to them" on public.adviser_document_requests;
create policy "client reads requests addressed to them" on public.adviser_document_requests
  for select to authenticated using (client_id = auth.uid());
-- All writes go through the RPCs below or the service role (the request API,
-- which also sends the client their email).

create or replace function public.set_document_request_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('reviewed', 'stored', 'cancelled') then raise exception 'Unknown status'; end if;
  update public.adviser_document_requests
     set status = p_status, updated_at = now()
   where id = p_id and adviser_id in (select public.my_adviser_firm_ids());
  if not found then raise exception 'Request not found'; end if;
end $$;
revoke all on function public.set_document_request_status(uuid, text) from public;
grant execute on function public.set_document_request_status(uuid, text) to authenticated;

-- The CLIENT attaches one of their own documents to an open request.
create or replace function public.fulfil_document_request(p_request_id uuid, p_document_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.documents d where d.id = p_document_id and d.user_id = auth.uid()) then
    raise exception 'Document not found';
  end if;
  update public.adviser_document_requests
     set status = 'uploaded', document_id = p_document_id, uploaded_at = now(), updated_at = now()
   where id = p_request_id and client_id = auth.uid() and status = 'requested';
  if not found then raise exception 'Request not found or already answered'; end if;
end $$;
revoke all on function public.fulfil_document_request(uuid, uuid) from public;
grant execute on function public.fulfil_document_request(uuid, uuid) to authenticated;

-- ── Document review state (the firm's copy of the record, never the client's) ─
create table if not exists public.adviser_document_reviews (
  adviser_id     uuid not null references public.advisers(id) on delete cascade,
  document_id    uuid not null references public.documents(id) on delete cascade,
  client_id      uuid not null references public.profiles(id) on delete cascade,
  review_status  text not null default 'in_review'
                 check (review_status in ('draft', 'in_review', 'signed', 'stored')),
  note           text,
  reviewed_by    uuid,
  reviewed_at    timestamptz not null default now(),
  primary key (adviser_id, document_id)
);
alter table public.adviser_document_reviews enable row level security;
drop policy if exists "firm reads its document reviews" on public.adviser_document_reviews;
create policy "firm reads its document reviews" on public.adviser_document_reviews
  for select to authenticated using (adviser_id in (select public.my_adviser_firm_ids()));

create or replace function public.set_document_review(p_client_id uuid, p_document_id uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if p_status not in ('draft', 'in_review', 'signed', 'stored') then raise exception 'Unknown review status'; end if;
  fid := public.adviser_firm_for_client(p_client_id);
  if not exists (select 1 from public.adviser_client_consents c
                 where c.client_id = p_client_id and c.adviser_id = fid and c.share_documents) then
    raise exception 'This client has not shared their documents with your firm';
  end if;
  if not exists (select 1 from public.documents d where d.id = p_document_id and d.user_id = p_client_id) then
    raise exception 'Document not found';
  end if;
  insert into public.adviser_document_reviews (adviser_id, document_id, client_id, review_status, note, reviewed_by, reviewed_at)
  values (fid, p_document_id, p_client_id, p_status, p_note, auth.uid(), now())
  on conflict (adviser_id, document_id) do update
    set review_status = excluded.review_status, note = coalesce(excluded.note, public.adviser_document_reviews.note),
        reviewed_by = excluded.reviewed_by, reviewed_at = now();
end $$;
revoke all on function public.set_document_review(uuid, uuid, text, text) from public;
grant execute on function public.set_document_review(uuid, uuid, text, text) to authenticated;

-- ── Matters ─────────────────────────────────────────────────────────────────
create table if not exists public.adviser_matters (
  id          uuid primary key default gen_random_uuid(),
  adviser_id  uuid not null references public.advisers(id) on delete cascade,
  client_id   uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('estate_plan', 'probate')),
  title       text not null,
  stage       integer not null default 0 check (stage between 0 and 4),
  next_step   text,
  due_date    date,
  opened_at   date not null default current_date,
  closed_at   date,
  created_by  uuid,
  updated_at  timestamptz not null default now()
);
alter table public.adviser_matters enable row level security;
create index if not exists adviser_matters_firm_idx on public.adviser_matters (adviser_id, closed_at);
drop policy if exists "firm reads its matters" on public.adviser_matters;
create policy "firm reads its matters" on public.adviser_matters
  for select to authenticated using (adviser_id in (select public.my_adviser_firm_ids()));

create or replace function public.save_adviser_matter(
  p_id uuid, p_client_id uuid, p_kind text, p_title text, p_stage integer, p_next_step text, p_due_date date)
returns uuid language plpgsql security definer set search_path = public as $$
declare fid uuid; mid uuid;
begin
  fid := public.adviser_firm_for_client(p_client_id);
  if p_id is null then
    insert into public.adviser_matters (adviser_id, client_id, kind, title, stage, next_step, due_date, created_by)
    values (fid, p_client_id, p_kind, p_title, coalesce(p_stage, 0), p_next_step, p_due_date, auth.uid())
    returning id into mid;
  else
    update public.adviser_matters
       set kind = p_kind, title = p_title, stage = coalesce(p_stage, stage), next_step = p_next_step,
           due_date = p_due_date, closed_at = case when coalesce(p_stage, stage) = 4 then coalesce(closed_at, current_date) else null end,
           updated_at = now()
     where id = p_id and adviser_id = fid and client_id = p_client_id;
    if not found then raise exception 'Matter not found'; end if;
    mid := p_id;
  end if;
  return mid;
end $$;
revoke all on function public.save_adviser_matter(uuid, uuid, text, text, integer, text, date) from public;
grant execute on function public.save_adviser_matter(uuid, uuid, text, text, integer, text, date) to authenticated;

create or replace function public.delete_adviser_matter(p_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.adviser_matters where id = p_id and adviser_id in (select public.my_adviser_firm_ids())
$$;
revoke all on function public.delete_adviser_matter(uuid) from public;
grant execute on function public.delete_adviser_matter(uuid) to authenticated;

-- ── One read for the whole workspace ────────────────────────────────────────
create or replace function public.get_adviser_workspace()
returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object(
    'requests', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id, 'client_id', r.client_id, 'client_name', coalesce(p.full_name, p.email),
        'doc_type', r.doc_type, 'note', r.note, 'status', r.status, 'document_id', r.document_id,
        'document_name', d.name, 'created_at', r.created_at, 'reminded_at', r.reminded_at,
        'uploaded_at', r.uploaded_at, 'updated_at', r.updated_at)
        order by r.created_at desc), '[]'::jsonb)
      from public.adviser_document_requests r
      join public.profiles p on p.id = r.client_id
      left join public.documents d on d.id = r.document_id
      where r.adviser_id in (select public.my_adviser_firm_ids())
        and p.adviser_id = r.adviser_id
    ),
    'reviews', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'document_id', v.document_id, 'client_id', v.client_id, 'client_name', coalesce(p.full_name, p.email),
        'document_name', d.name, 'doc_type', d.doc_type, 'document_updated_at', d.updated_at,
        'review_status', v.review_status, 'note', v.note, 'reviewed_at', v.reviewed_at)
        order by v.reviewed_at desc), '[]'::jsonb)
      from public.adviser_document_reviews v
      join public.profiles p on p.id = v.client_id
      join public.documents d on d.id = v.document_id
      join public.adviser_client_consents c on c.client_id = v.client_id and c.adviser_id = v.adviser_id and c.share_documents
      where v.adviser_id in (select public.my_adviser_firm_ids())
        and p.adviser_id = v.adviser_id
    ),
    'matters', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'client_id', m.client_id, 'client_name', coalesce(p.full_name, p.email),
        'kind', m.kind, 'title', m.title, 'stage', m.stage, 'next_step', m.next_step,
        'due_date', m.due_date, 'opened_at', m.opened_at, 'closed_at', m.closed_at, 'updated_at', m.updated_at)
        order by m.closed_at nulls first, m.due_date nulls last, m.opened_at), '[]'::jsonb)
      from public.adviser_matters m
      join public.profiles p on p.id = m.client_id
      where m.adviser_id in (select public.my_adviser_firm_ids())
        and p.adviser_id = m.adviser_id
    )
  )
$$;
revoke all on function public.get_adviser_workspace() from public;
grant execute on function public.get_adviser_workspace() to authenticated;
