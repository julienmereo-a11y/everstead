-- ════════════════════════════════════════════════════════════════════════════
-- RLS corrections — security-hardening audit (#1, #2, #4).
-- Every statement below was VERIFIED against production inside rolled-back
-- transactions (created/dropped, tested as the anon role, then ROLLBACK — so
-- production was never actually changed). Review, then apply.
--
-- ROLLOUT
--   PART 1 — safe to apply ANY time (no client dependency):
--     • #1 trusted_people anon leak: pure policy drop. The invite-display flow
--       already uses the existing SECURITY DEFINER get_invite_details() RPC, so
--       nothing client-side relies on the dropped policy. Verified: after the
--       drop, anon's direct table read = 0 and the RPC still returns the invite.
--     • #2 family RPC: additive (creating a function breaks nothing).
--     • #4 profiles INSERT: tightened to self.
--   PART 2 — apply AFTER the matching AcceptFamilyInvite client change
--     (rpc('get_family_invite_details')) is deployed, OR accept a brief window
--     where the family-invite landing page can't load.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── PART 1 — safe now ───────────────────────────────────────────────────────

-- #1 CRITICAL — public.trusted_people was readable by the anon role via policy
--    "anon_invite_lookup" USING (true). Verified leak: anon (with the publishable
--    key that ships in the bundle) could read the whole table — every user's
--    trusted-contact names, emails, INVITE TOKENS and access grants. The display
--    flow already goes through SECURITY DEFINER public.get_invite_details(text),
--    so this policy is dead weight. No client change needed.
drop policy if exists "anon_invite_lookup" on public.trusted_people;

-- #2 MEDIUM — token-scoped, SECURITY DEFINER lookup to replace the broad
--    family_memberships anon read. Returns only the token-matched row, plus the
--    primary's name (the old client fetch for it returned nothing under RLS).
create or replace function public.get_family_invite_details(p_token text)
returns table (id uuid, primary_user_id uuid, secondary_email text, invite_status text, invited_at timestamptz, primary_name text)
language sql
security definer
set search_path = public
as $$
  select fm.id, fm.primary_user_id, fm.secondary_email, fm.invite_status, fm.invited_at,
         (select full_name from public.profiles where id = fm.primary_user_id)
  from public.family_memberships fm
  where fm.invite_token::text = p_token
  limit 1;
$$;
revoke all on function public.get_family_invite_details(text) from public;
grant execute on function public.get_family_invite_details(text) to anon, authenticated;

-- #4 MINOR — profiles INSERT used WITH CHECK (true) (any id). Restrict to self.
drop policy if exists "profiles: insert on signup" on public.profiles;
create policy "profiles: insert own row"
  on public.profiles for insert to public
  with check (auth.uid() = id);

-- ─── PART 2 — apply AFTER deploying the AcceptFamilyInvite client change ──────

-- #2 (cont.) drop the broad family_memberships anon read ("public token lookup"
--    USING (invite_status = 'pending')). Verified: after the drop, anon's direct
--    read = 0 and get_family_invite_details() still returns the row.
drop policy if exists "public token lookup" on public.family_memberships;

-- ─── FLAGGED, NOT scripted (need a design decision) ──────────────────────────
-- #3 "delegates_can_update_own_invites" lets a delegate UPDATE their own
--    trusted_people row including access_grants (self-escalation). Recommend a
--    SECURITY DEFINER accept_invite(token) that only flips invite_status, plus
--    column-level UPDATE grants.
-- #5 "delegates_can_read_shared_*" grant an accepted delegate read to ALL of the
--    owner's accounts/documents/instructions/alerts/activity — ignoring the
--    access_grants areas AND the while-alive/after-death timing. Recommend folding
--    access_grants + owner_status='deceased' into those policies, or routing
--    delegate reads through a server endpoint that enforces grants + timing.
