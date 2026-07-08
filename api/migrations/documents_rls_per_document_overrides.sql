-- Applied 2026-07-08 (security audit). Record of the live migration.
--
-- Enforce per-document access at the DATABASE layer. Previously only the client-side
-- documentAccess.js honoured documents.access_overrides + release_timing, so a delegate
-- could query the documents table directly (with their own session) and read a
-- sealed/denied document while the owner was alive. This policy mirrors
-- resolveDocumentAccess() exactly (verified against 13 scenarios): deny wins,
-- sealed/immediate release timing, per-document allow overrides, case-insensitive
-- document-type matching, and the after-death person-level timing gate.

drop policy if exists delegates_can_read_shared_documents on public.documents;

create policy delegates_can_read_shared_documents
on public.documents
for select
using (
  exists (
    select 1
    from trusted_people tp
    join profiles owner on owner.id = tp.user_id
    where tp.user_id = documents.user_id
      and tp.email = auth.email()
      and tp.invite_status = 'accepted'
      -- not explicitly denied for THIS document
      and not (coalesce(documents.access_overrides -> 'deny', '[]'::jsonb) ? (tp.id::text))
      -- role-level base access (area + doc_type) OR an explicit per-document allow
      and (
        (
          (tp.access_grants -> 'accessAreas') ? 'documents'
          and (
            coalesce(jsonb_typeof(tp.access_grants -> 'documentTypes'), 'null') <> 'array'
            or jsonb_array_length(tp.access_grants -> 'documentTypes') = 0
            or exists (
              select 1 from jsonb_array_elements_text(tp.access_grants -> 'documentTypes') dt
              where lower(dt) = lower(documents.doc_type)
            )
          )
        )
        or (coalesce(documents.access_overrides -> 'allow', '[]'::jsonb) ? (tp.id::text))
      )
      -- release timing: sealed docs (or after-death person timing under 'default') require release
      and (
        case coalesce(documents.release_timing, 'default')
          when 'sealed'    then owner.owner_status = any (array['deceased','incapacitated'])
          when 'immediate' then true
          else (coalesce(tp.access_grants ->> 'accessTiming', 'always') <> 'after_death'
                or owner.owner_status = any (array['deceased','incapacitated']))
        end
      )
  )
);
