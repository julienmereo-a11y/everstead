-- Harden every token that travels inside an email link against case-mangling.
--
-- Corporate email security gateways (Microsoft Safe Links, Proofpoint, etc.)
-- rewrite links and can change the case of the URL. A case-sensitive token then
-- no longer matches on lookup. We hit this with a personal-message view link sent
-- to a @deepl.com recipient: the token's case was changed in transit and the
-- secure link broke ("message isn't available").
--
-- Fix: make these columns CITEXT (case-insensitive text) so every lookup matches
-- regardless of case — covers all lookup sites (client + serverless) at once with
-- no application code changes. All existing values are lowercase hex / UUID, so
-- this is fully backward-compatible (verified: 0 mixed-case rows before applying).
--
-- Session/bearer tokens (delegate_sessions.access_token, mfa_pending.*) are
-- intentionally NOT changed — they are internal credentials, never email links,
-- and benefit from staying case-sensitive.
--
-- Also: messages.view_token generation switched from base64url to lowercase hex
-- in api/messages/release-link.js so freshly-minted links are clean lowercase.

create extension if not exists citext with schema extensions;

-- Personal-message secure view links (/m/:token)
alter table public.messages
  alter column view_token type extensions.citext using view_token::extensions.citext;

-- Trusted-person / delegate invite links (?token=...)
alter table public.trusted_people
  alter column invite_token type extensions.citext using invite_token::extensions.citext;

-- Gift redemption links (/redeem-gift?code=...)
alter table public.gift_codes
  alter column code type extensions.citext using code::extensions.citext;

-- Unsubscribe links
alter table public.marketing_leads
  alter column unsubscribe_token type extensions.citext using unsubscribe_token::extensions.citext;
alter table public.subprocessor_notification_subscribers
  alter column unsubscribe_token type extensions.citext using unsubscribe_token::extensions.citext;

-- Note: family_memberships.invite_token and admin_invites.token are already uuid,
-- which compares case-insensitively, so they need no change.
