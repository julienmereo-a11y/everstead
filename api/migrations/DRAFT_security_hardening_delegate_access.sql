-- ════════════════════════════════════════════════════════════════════════════
-- RLS corrections — security-hardening audit (#3, #5): delegate privilege scoping.
-- Every statement was VERIFIED against production inside rolled-back transactions
-- (created/tested as an impersonated delegate, then ROLLBACK — prod never changed).
--
-- NO client changes required. Safe to apply in one shot (no deploy ordering).
-- Review, then apply in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── #3 — delegate self-escalation ───────────────────────────────────────────
-- "delegates_can_update_own_invites" (USING email = auth.email()) let a delegate
-- UPDATE *any* column of their own trusted_people row — including access_grants
-- (grant themselves more areas / flip timing) and role. But delegates legitimately
-- edit their own name/contact + accept/decline, so we keep the policy and add a
-- trigger that blocks ONLY the privilege/identity columns for non-owners.
-- Owners (auth.uid() = user_id) and service-role server code (auth.uid() IS NULL)
-- are unaffected. Verified: a delegate's access_grants/role edits raise; their
-- invite_status + name edits succeed.
create or replace function public.tp_block_delegate_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null or auth.uid() = old.user_id then
    return new;                       -- service role or the owner: allow anything
  end if;
  if new.access_grants is distinct from old.access_grants
     or new.role        is distinct from old.role
     or new.user_id     is distinct from old.user_id
     or new.email       is distinct from old.email
     or new.invite_token is distinct from old.invite_token
     or new.invited_at  is distinct from old.invited_at then
    raise exception 'delegates may not modify access grants, role, or identity fields';
  end if;
  return new;
end $fn$;

drop trigger if exists tp_block_delegate_escalation on public.trusted_people;
create trigger tp_block_delegate_escalation
  before update on public.trusted_people
  for each row execute function public.tp_block_delegate_escalation();

-- ─── #5 — delegate over-grant (areas + timing) ───────────────────────────────
-- The six "delegates_can_read_shared_*" policies granted an accepted delegate read
-- to ALL of the owner's data, ignoring (a) which areas the owner granted to THIS
-- delegate and (b) the while-alive vs after-death timing. Rewritten to enforce:
--   • AREA  — accounts/documents/instructions only if access_grants.accessAreas
--             contains that area (accounts, documents, activity log + alerts have
--             no grantable area, so they are timing-gated only — per product call).
--   • TIMING — an 'after_death' grant unlocks only once Everstead has verified
--             death/incapacity (profiles.owner_status in deceased/incapacitated);
--             'always' (while-alive) grants stay visible immediately.

drop policy if exists "delegates_can_read_shared_accounts" on public.accounts;
create policy "delegates_can_read_shared_accounts" on public.accounts for select to public
using (exists (
  select 1 from public.trusted_people tp join public.profiles owner on owner.id = tp.user_id
  where tp.user_id = accounts.user_id and tp.email = auth.email() and tp.invite_status = 'accepted'
    and (tp.access_grants->'accessAreas') ? 'accounts'
    and (coalesce(tp.access_grants->>'accessTiming','always') <> 'after_death'
         or owner.owner_status in ('deceased','incapacitated'))));

drop policy if exists "delegates_can_read_shared_documents" on public.documents;
create policy "delegates_can_read_shared_documents" on public.documents for select to public
using (exists (
  select 1 from public.trusted_people tp join public.profiles owner on owner.id = tp.user_id
  where tp.user_id = documents.user_id and tp.email = auth.email() and tp.invite_status = 'accepted'
    and (tp.access_grants->'accessAreas') ? 'documents'
    and (coalesce(tp.access_grants->>'accessTiming','always') <> 'after_death'
         or owner.owner_status in ('deceased','incapacitated'))));

drop policy if exists "delegates_can_read_shared_instructions" on public.instructions;
create policy "delegates_can_read_shared_instructions" on public.instructions for select to public
using (exists (
  select 1 from public.trusted_people tp join public.profiles owner on owner.id = tp.user_id
  where tp.user_id = instructions.user_id and tp.email = auth.email() and tp.invite_status = 'accepted'
    and (tp.access_grants->'accessAreas') ? 'instructions'
    and (coalesce(tp.access_grants->>'accessTiming','always') <> 'after_death'
         or owner.owner_status in ('deceased','incapacitated'))));

drop policy if exists "delegates_can_read_shared_instruction_steps" on public.instruction_steps;
create policy "delegates_can_read_shared_instruction_steps" on public.instruction_steps for select to public
using (exists (
  select 1 from public.instructions i
    join public.trusted_people tp on tp.user_id = i.user_id
    join public.profiles owner on owner.id = tp.user_id
  where i.id = instruction_steps.instruction_id and tp.email = auth.email() and tp.invite_status = 'accepted'
    and (tp.access_grants->'accessAreas') ? 'instructions'
    and (coalesce(tp.access_grants->>'accessTiming','always') <> 'after_death'
         or owner.owner_status in ('deceased','incapacitated'))));

-- alerts + activity_log: no grantable area — timing gate only.
drop policy if exists "delegates_can_read_shared_alerts" on public.alerts;
create policy "delegates_can_read_shared_alerts" on public.alerts for select to public
using (exists (
  select 1 from public.trusted_people tp join public.profiles owner on owner.id = tp.user_id
  where tp.user_id = alerts.user_id and tp.email = auth.email() and tp.invite_status = 'accepted'
    and (coalesce(tp.access_grants->>'accessTiming','always') <> 'after_death'
         or owner.owner_status in ('deceased','incapacitated'))));

drop policy if exists "delegates_can_read_shared_activity" on public.activity_log;
create policy "delegates_can_read_shared_activity" on public.activity_log for select to public
using (exists (
  select 1 from public.trusted_people tp join public.profiles owner on owner.id = tp.user_id
  where tp.user_id = activity_log.user_id and tp.email = auth.email() and tp.invite_status = 'accepted'
    and (coalesce(tp.access_grants->>'accessTiming','always') <> 'after_death'
         or owner.owner_status in ('deceased','incapacitated'))));
