-- Applied 2026-08-31. Broadcasts can target one language ('fr' | 'en'); NULL
-- means all. Scheduled sends re-resolve their audience at send time, so the
-- language rides with the stored broadcast. Filter semantics in
-- api/_lib/broadcast.js: 'fr' matches language='fr', 'en' matches everything
-- else including NULL (profiles.language defaults to 'en' but be robust).
alter table public.admin_broadcasts
  add column if not exists language text check (language in ('fr', 'en'));
