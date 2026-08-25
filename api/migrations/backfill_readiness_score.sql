-- ─────────────────────────────────────────────────────────────────────────────
-- One-time backfill of profiles.readiness_score (applied 2026-08-25).
--
-- The score was only ever computed CLIENT-side in the dashboard and never
-- written back, so the column was 0 for every member on every plan, including
-- a paying Everstead+ member with 5 accounts, 4 documents and 3 trusted people.
-- That column is what the ADMIN panel and the ADVISER portal display, so
-- advisers were shown 0% readiness for every client they manage.
--
-- Dashboard.jsx now persists the score (guarded so a half-loaded dashboard
-- cannot write a spurious 0). This backfill stops the admin and adviser views
-- being wrong until each member next signs in. It mirrors the client formula:
-- targets accounts 5, non-missing documents 5, trusted people 5 on plans with
-- messages / 2 otherwise, instructions 3; minus 5 per unread critical alert,
-- capped at 15. 12 rows changed; the rest genuinely score 0.
-- ─────────────────────────────────────────────────────────────────────────────
with c as (
  select p.id, p.plan,
    (select count(*) from accounts a where a.user_id=p.id) as acc,
    (select count(*) from documents d where d.user_id=p.id and coalesce(d.status,'') <> 'missing') as doc,
    (select count(*) from trusted_people t where t.user_id=p.id) as ppl,
    (select count(*) from instructions i where i.user_id=p.id) as ins,
    (select count(*) from alerts al where al.user_id=p.id and al.severity='critical' and al.is_read is not true) as crit
  from profiles p where p.role <> 'delegate'
), calc as (
  select id,
    greatest(0, round(((least(acc::numeric/5,1) + least(doc::numeric/5,1)
       + least(ppl::numeric/(case when plan in ('family','advisor') then 5 else 2 end),1)
       + least(ins::numeric/3,1)) / 4) * 100)
      - least(crit*5, 15))::int as computed
  from c
)
update profiles p set readiness_score = calc.computed
from calc where calc.id = p.id and p.readiness_score is distinct from calc.computed;
