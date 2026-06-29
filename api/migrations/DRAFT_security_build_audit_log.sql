-- ════════════════════════════════════════════════════════════════════════════
-- Security build #3 — append-only audit log (activity_log).
-- Verified against production in rolled-back transactions. No deploy ordering
-- concern, but the matching client/server logging code ships on the same branch,
-- so apply this around the same time as that deploy. Review, then apply.
--
-- Context: activity_log already had RLS on with SELECT policies (owner + delegate)
-- but NO insert policy — so client logActivity() inserts were being denied and the
-- table was empty (it recorded nothing). This makes logging work AND makes the
-- trail tamper-evident (append-only).
-- ════════════════════════════════════════════════════════════════════════════

-- Append own activity (the client logActivity helper, for a user's own actions).
drop policy if exists "activity_log: insert own" on public.activity_log;
create policy "activity_log: insert own" on public.activity_log
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Append-only: there are deliberately NO update/delete policies, and we revoke the
-- privileges too so a future policy can't silently re-enable tampering. service_role
-- still bypasses RLS for trusted server-side writes + legitimate account-deletion.
revoke insert, update, delete, truncate on public.activity_log from anon;
revoke update, delete, truncate on public.activity_log from authenticated;

-- Trusted-person access logging. A delegate can't insert into the OWNER's
-- activity_log under the own-rows policy, so route it through a SECURITY DEFINER
-- function that first verifies the caller really is an accepted delegate of that
-- owner — so the entry can't be forged.
create or replace function public.log_delegate_access(
  p_owner uuid,
  p_action text,
  p_resource_type text default null,
  p_resource_name text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.trusted_people
    where user_id = p_owner and email = auth.email() and invite_status = 'accepted'
  ) then
    return;  -- caller is not an accepted delegate of this owner: record nothing
  end if;
  insert into public.activity_log(user_id, actor_id, action, resource_type, resource_name, metadata)
  values (p_owner, auth.uid(), p_action, p_resource_type, p_resource_name, '{}'::jsonb);
end $$;
revoke all on function public.log_delegate_access(uuid, text, text, text) from public;
grant execute on function public.log_delegate_access(uuid, text, text, text) to authenticated;
