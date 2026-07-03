-- Per-document access control (homepage claim: per-item permissions).
-- access_overrides: { "allow": [trusted_person_ids], "deny": [trusted_person_ids] }
--   layered on top of the person's role-level access_grants.
-- release_timing: 'default'  → follow each person's accessTiming
--                 'immediate' → available now to anyone with access
--                 'sealed'    → only released once the owner's passing is verified
alter table public.documents
  add column if not exists access_overrides jsonb not null default '{}'::jsonb,
  add column if not exists release_timing text not null default 'default'
    check (release_timing in ('default', 'immediate', 'sealed'));
