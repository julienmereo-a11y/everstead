-- Adviser invitations: a tokened link lets a newly-seated adviser set their own
-- password and access the portal (mirrors the admin_invites flow). The token lives
-- on the seat row; the accept page reads minimal firm branding by token (anon).

alter table public.adviser_members
  add column if not exists invite_token uuid not null default gen_random_uuid();

-- Minimal invite details for the accept page (firm branding + the invited email),
-- looked up by the link token. SECURITY DEFINER; safe to expose (no secrets).
create or replace function public.get_adviser_invite(p_token uuid)
returns table(email text, role text, invite_status text, firm_name text, logo_url text)
language sql security definer stable set search_path = public as $$
  select m.email, m.role, m.invite_status, a.firm_name, a.logo_url
  from public.adviser_members m
  join public.advisers a on a.id = m.adviser_id
  where m.invite_token = p_token
$$;
revoke all on function public.get_adviser_invite(uuid) from public;
grant execute on function public.get_adviser_invite(uuid) to authenticated, anon;
