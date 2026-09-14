-- 2026-09-14: a personal note on trusted-person invitations.
--
-- The invitation email and the accept page now carry the owner's own words,
-- which is what makes an invitee open the thing. get_invite_details is the
-- only path an anonymous invitee has to the row, so it returns the note too.
-- Return type changes need a drop; grants are restated because DROP loses them.

alter table public.trusted_people add column if not exists invite_message text;

drop function if exists public.get_invite_details(text);

create function public.get_invite_details(p_token text)
returns table(
  id uuid, name text, email text, role text, invite_status text,
  invited_at timestamptz, owner_name text, owner_email text, invite_message text
)
language plpgsql security definer set search_path to 'public'
as $$
begin
  return query
  select tp.id, tp.name, tp.email, tp.role, tp.invite_status, tp.invited_at,
         p.full_name as owner_name, p.email as owner_email, tp.invite_message
  from   trusted_people tp
  left join profiles p on p.id = tp.user_id
  where  tp.invite_token = p_token;
end;
$$;

revoke all on function public.get_invite_details(text) from public;
grant execute on function public.get_invite_details(text) to anon, authenticated, service_role;
