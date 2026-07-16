-- APPLIED to prod 2026-07-16. Released Personal Messages for a delegate.
-- Messages RLS is owner-only, so the production delegate dashboard could never
-- load them (only the demo showed them). Validation mirrors log_delegate_access:
-- the caller must be signed in AND their auth email must match the accepted
-- trusted_people row for this invite token — possessing a leaked token alone is
-- NOT enough.
--
-- Visibility rules (matching what the product promises):
--   * released messages addressed to this person — always
--   * sealed 'after_death' messages — only once the owner is verified
--     deceased/incapacitated (auto-release on passing)
--   * sealed 'on_date' messages — NEVER early, even after a verified passing:
--     a wedding-day message stays sealed until the chosen day (the cron
--     releases it, after which the first rule shows it)
-- view_token is deliberately not returned.
create or replace function public.get_delegate_messages(p_token text)
returns table (
  id uuid, title text, type text, content text,
  media_url text, video_url text,
  recipient_name text, recipient_role text,
  released boolean, released_at timestamptz,
  release_timing text, release_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path to 'public'
as $$
  select m.id, m.title, m.type, m.content,
         m.media_url, m.video_url,
         m.recipient_name, m.recipient_role,
         m.released, m.released_at,
         m.release_timing, m.release_at,
         m.created_at
  from public.trusted_people tp
  join public.profiles p on p.id = tp.user_id
  join public.messages m on m.user_id = tp.user_id
  where tp.invite_token::text = p_token
    and tp.email = auth.email()
    and tp.invite_status = 'accepted'
    and lower(trim(m.recipient_name)) = lower(trim(tp.name))
    and (
      m.released
      or (coalesce(p.owner_status, 'active') in ('deceased', 'incapacitated')
          and m.release_timing = 'after_death')
    )
  order by m.created_at desc;
$$;

revoke all on function public.get_delegate_messages(text) from public;
grant execute on function public.get_delegate_messages(text) to authenticated;
