-- ============================================================================
-- Everstead for Business, part 4: a second factor, and taking a document
-- without opening an account.
--
-- Two gaps, both found by reading what FoxNot's DocSecure does for French
-- notaires and both real:
--
--   1. A claim link was the ONLY thing guarding a delivery. Anyone who saw the
--      email, or a forward of it, held the capability. A one-time code sent to
--      the address the delivery was addressed to makes that two factors, and
--      lets us describe it as such honestly.
--
--   2. Accepting required creating an Everstead account. For a one-off exchange
--      that is pure friction, and it is the thing a competitor does better:
--      their recipient never signs up. A verified recipient can now take the
--      file and leave, with the vault offered afterwards rather than demanded
--      first. Hence the new 'downloaded' status, which is a real outcome and
--      not a failure to convert.
--
-- The code is stored as an HMAC through the same api/_lib/mfa-crypto helper the
-- sign-in codes use, bound to the recipient address. The genuine protection is
-- the attempt ceiling and the ten-minute expiry, not the hash: anyone who can
-- read this table can already read the storage bucket.
-- ============================================================================

alter table public.inbound_deliveries
  add column if not exists claim_code_hash       text,
  add column if not exists claim_code_expires_at timestamptz,
  add column if not exists claim_code_sent_at    timestamptz,
  add column if not exists claim_attempts        integer not null default 0,
  add column if not exists claim_verified_at     timestamptz,
  add column if not exists downloaded_at         timestamptz;

-- 'downloaded': verified and taken, without an account. The organisation sees
-- that it arrived; the recipient never became a member.
alter table public.inbound_deliveries drop constraint if exists inbound_deliveries_status_check;
alter table public.inbound_deliveries add constraint inbound_deliveries_status_check
  check (status in ('sent', 'accepted', 'declined', 'expired', 'downloaded'));

comment on column public.inbound_deliveries.claim_code_hash is
  'HMAC of the one-time code, via api/_lib/mfa-crypto. Never the code itself.';

-- The landing page has to say WHERE the code is going without publishing the
-- address to whoever holds the link, so the masking happens server-side.
-- Adding OUT columns means dropping and recreating; the grant is restated below.
drop function if exists public.get_delivery_by_claim_token(text);

create function public.get_delivery_by_claim_token(p_token text)
returns table (
  title          text,
  doc_type       text,
  note           text,
  sender_name    text,
  sent_at        timestamptz,
  expires_at     timestamptz,
  status         text,
  recipient_hint text,
  code_sent      boolean
)
language sql stable security definer set search_path = public, pg_temp as $$
  select d.title, d.doc_type, d.note, d.sender_name, d.sent_at, d.expires_at, d.status,
         -- j••••@example.com: enough to recognise your own address, not enough
         -- to learn someone else's.
         regexp_replace(split_part(d.recipient_email::text, '@', 1), '^(.).*$', '\1')
           || repeat('•', greatest(length(split_part(d.recipient_email::text, '@', 1)) - 1, 1))
           || '@' || split_part(d.recipient_email::text, '@', 2),
         (d.claim_code_hash is not null
            and d.claim_code_expires_at is not null
            and d.claim_code_expires_at > now())
  from public.inbound_deliveries d
  where d.claim_token = p_token
    and p_token is not null
    and length(p_token) >= 20
  limit 1
$$;
grant execute on function public.get_delivery_by_claim_token(text) to anon, authenticated;
