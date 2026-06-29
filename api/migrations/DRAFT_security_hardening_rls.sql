-- ════════════════════════════════════════════════════════════════════════════
-- DRAFT — RLS corrections from the security-hardening audit.
-- ⚠️  DO NOT APPLY TO PRODUCTION AS-IS. For review.
--   • #1 and #2 DROP an anon read policy and MUST ship together with the matching
--     client change (rpc() instead of a direct table query) or invite flows break.
--   • #3/#5 are flagged design items, intentionally NOT scripted to completion.
--   • Verify column names against the live schema before running.
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- #1  CRITICAL — public.trusted_people was fully readable by the anon role.
--     Policy "anon_invite_lookup" used USING (true) for {anon}. Verified by test:
--     an unauthenticated caller (using the public anon key that ships in the JS
--     bundle) could read EVERY user's trusted-contact names, emails, invite
--     tokens, and access_grants — i.e. the full table. Invite tokens are
--     credentials, so this is the headline finding.
--     Fix: drop the blanket anon read; expose a single-row, token-scoped RPC.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "anon_invite_lookup" on public.trusted_people;

create or replace function public.invite_lookup(p_token text)
returns table (id uuid, name text, role text, user_id uuid, invite_status text, access_grants jsonb)
language sql
security definer
set search_path = public
as $$
  select id, name, role, user_id, invite_status, access_grants
  from public.trusted_people
  where invite_token = p_token
  limit 1;
$$;
revoke all on function public.invite_lookup(text) from public;
grant execute on function public.invite_lookup(text) to anon, authenticated;
-- CLIENT CHANGE REQUIRED (ship together): replace
--   supabase.from('trusted_people').select(...).eq('invite_token', token)
-- in AcceptInvite.jsx / DelegateRegister.jsx / DelegateDashboard.jsx with
--   supabase.rpc('invite_lookup', { p_token: token })
-- (Authenticated delegates keep reading their own row via the existing
--  "delegates_can_read_own_invites" email-scoped policy.)

-- ─────────────────────────────────────────────────────────────────────────────
-- #2  MEDIUM — public.family_memberships pending rows were readable by anyone.
--     Policy "public token lookup" used USING (invite_status = 'pending') for
--     {public}. Verified: anon could read pending family-invite rows (tokens,
--     ids). Same token-scoped RPC fix.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "public token lookup" on public.family_memberships;

create or replace function public.family_invite_lookup(p_token uuid)
returns table (id uuid, primary_user_id uuid, invite_status text)
language sql
security definer
set search_path = public
as $$
  select id, primary_user_id, invite_status
  from public.family_memberships
  where invite_token = p_token and invite_status = 'pending'
  limit 1;
$$;
revoke all on function public.family_invite_lookup(uuid) from public;
grant execute on function public.family_invite_lookup(uuid) to anon, authenticated;
-- CLIENT CHANGE REQUIRED: AcceptFamilyInvite.jsx token lookup → rpc('family_invite_lookup').

-- ─────────────────────────────────────────────────────────────────────────────
-- #4  MINOR — profiles INSERT used WITH CHECK (true): a row could be inserted
--     with any id. Restrict creation to the caller's own id.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "profiles: insert on signup" on public.profiles;
create policy "profiles: insert own row"
  on public.profiles for insert to public
  with check (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- #3  MEDIUM (FLAGGED, not scripted) — "delegates_can_update_own_invites" allows
--     a delegate to UPDATE their own trusted_people row (matched by email),
--     including access_grants — i.e. widen their own access. Recommended fix:
--     replace with a SECURITY DEFINER accept_invite(token) that ONLY flips
--     invite_status to 'accepted' (and sets the delegate id), plus column-level
--     UPDATE grants. Needs the accept-flow column names + a client change, so it
--     is left for a dedicated change rather than guessed here.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- #5  MEDIUM (FLAGGED, design) — the delegates_can_read_shared_* policies grant
--     an ACCEPTED delegate read access to ALL of the owner's accounts, documents,
--     instructions, alerts and activity, regardless of (a) the granular
--     access_grants areas the owner actually granted, and (b) the access timing
--     (while-alive vs after-death) / owner_status. A delegate could therefore
--     read ungranted categories — and read them while the owner is alive — by
--     calling the API directly with their own session.
--     Recommended fix: fold access_grants.accessAreas + owner_status='deceased'
--     into each delegate SELECT policy, OR route all delegate reads through a
--     server endpoint that enforces grants + timing centrally. Left unchanged
--     here to avoid breaking the delegate dashboard before the model is agreed.
-- ─────────────────────────────────────────────────────────────────────────────
