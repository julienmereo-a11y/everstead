-- Applied 2026-07-08 (security audit). Record of the live migration.
--
-- 1. Bind admin-invite acceptance to the invited email. Previously ANY authenticated
--    user who obtained a valid pending token could self-promote to admin; now the
--    invite's email must match the caller's (mirrors delegate-register + claim_adviser_invites).
-- 2. Pin search_path on the remaining SECURITY DEFINER functions (defence-in-depth).

create or replace function public.accept_admin_invite(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_invite     admin_invites%rowtype;
  v_user_id    uuid := auth.uid();
  v_user_email text;
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  select email into v_user_email from auth.users where id = v_user_id;

  select * into v_invite
  from admin_invites
  where token = p_token and status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('error', 'invalid_or_used');
  end if;

  if lower(coalesce(v_invite.email, '')) <> lower(coalesce(v_user_email, '')) then
    return jsonb_build_object('error', 'email_mismatch');
  end if;

  update profiles set role = 'admin' where id = v_user_id;

  update admin_invites
  set status = 'accepted', accepted_at = now(), accepted_by = v_user_id
  where token = p_token;

  return jsonb_build_object('ok', true);
end;
$function$;

alter function public.recalculate_readiness(uuid)     set search_path = public, pg_temp;
alter function public.stamp_first_account_added()     set search_path = public, pg_temp;
alter function public.stamp_first_contact_added()     set search_path = public, pg_temp;
alter function public.stamp_first_document_added()    set search_path = public, pg_temp;
alter function public.stamp_first_instruction_added() set search_path = public, pg_temp;
