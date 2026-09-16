-- ============================================================================
-- One accept per organisation, ever.
--
-- "If people receive documents, they should be automatically stored in their
-- Everstead account." Right instinct, and the literal version is a hole: any
-- verified organisation could then drop files into a stranger's vault, which is
-- exactly what the accept step exists to stop.
--
-- So: the FIRST delivery from an organisation is accepted by the person, and
-- that accept is what connects them to it. Every delivery after that files
-- itself, which is how a payslip behaves in a coffre-fort and what anyone
-- sending monthly documents expects. One consent, then it is a safe.
--
-- Default true, because a member who accepted an organisation once said yes to
-- the relationship and not to a single file. Switchable per organisation from
-- Who has access.
-- ============================================================================

alter table public.member_connections
  add column if not exists auto_file boolean not null default true;

comment on column public.member_connections.auto_file is
  'When true, documents from this organisation are filed straight into the member vault instead of waiting to be accepted. The member controls it from Who has access.';

-- The member owns this switch. Everything else about a connection stays
-- read-only to them (an unrestricted UPDATE policy would let someone re-point
-- their row at a different organisation), so it is a function, not a policy.
create or replace function public.set_connection_auto_file(p_connection_id uuid, p_auto_file boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.member_connections
     set auto_file = coalesce(p_auto_file, true)
   where id = p_connection_id and member_id = auth.uid();
  if not found then raise exception 'Connection not found'; end if;
end $$;
grant execute on function public.set_connection_auto_file(uuid, boolean) to authenticated;

-- Adding an OUT column means dropping and recreating; the grant is restated.
drop function if exists public.get_my_connections();

create function public.get_my_connections()
returns table (
  connection_id uuid, org_id uuid, firm_name text, firm_type text, org_kind text,
  logo_url text, contact_email text, status text, started_at timestamptz, auto_file boolean
)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id, a.id, a.firm_name, a.firm_type, a.org_kind, a.logo_url, a.contact_email,
         c.status, c.started_at, c.auto_file
  from public.member_connections c
  join public.advisers a on a.id = c.org_id
  where c.member_id = auth.uid() and c.status <> 'ended'
  order by c.started_at desc
$$;
grant execute on function public.get_my_connections() to authenticated;
