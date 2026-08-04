-- Applied live to production 2026-07-24 (Supabase project uwgrzdxumhreagmuskdw).
--
-- Record which From address each broadcast used, now that the sender is selectable
-- from a server-side allowlist (hello@ / julien@ / support@) in broadcast-email.js.
alter table public.admin_broadcasts add column if not exists sender text;
