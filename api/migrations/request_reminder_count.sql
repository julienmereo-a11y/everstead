-- Automatic chasing needs to know when to stop.
--
-- reminded_at already recorded that a nudge happened, but not how many, so a
-- request nobody ever answers would be chased forever. Two is the ceiling:
-- after that it is a conversation for a human rather than another email, and
-- the alternative is Everstead becoming the thing an employer nags people
-- through.
alter table public.adviser_document_requests
  add column if not exists reminder_count integer not null default 0;

-- Rows already nudged by hand from the portal should not get two more.
update public.adviser_document_requests
   set reminder_count = 1
 where reminded_at is not null and reminder_count = 0;

create index if not exists adviser_document_requests_due_idx
  on public.adviser_document_requests (status, created_at)
  where status = 'requested';
