-- recalculate_readiness(uuid) was SECURITY DEFINER and executable by anon. It
-- takes any user id, counts six of that person's tables, and WRITES
-- profiles.readiness_score for them. An anonymous caller could therefore
-- overwrite any member's score and, from the returned number, infer roughly how
-- much that member had in their vault.
--
-- Nothing calls it: not the app, not any other function, not a trigger. Rather
-- than drop it (it is a useful manual backfill), it is taken off the public
-- API and given a guard of its own, so a future GRANT cannot reopen this.
--
-- Applied to production 2026-09-16.

revoke execute on function public.recalculate_readiness(uuid) from anon, authenticated, public;

create or replace function public.recalculate_readiness(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  score int := 0;
  acc_count int; doc_count int; people_count int; inst_count int; wish_count int; sub_count int;
begin
  -- Belt and braces alongside the REVOKE above: a signed-in caller may only
  -- recompute their own score, and only the service role may do it for others.
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not permitted';
  end if;

  select count(*) into acc_count    from public.accounts      where user_id = p_user_id;
  select count(*) into doc_count    from public.documents     where user_id = p_user_id and status != 'missing';
  select count(*) into people_count from public.trusted_people where user_id = p_user_id;
  select count(*) into inst_count   from public.instructions  where user_id = p_user_id;
  select count(*) into wish_count   from public.wishes        where user_id = p_user_id;
  select count(*) into sub_count    from public.subscriptions where user_id = p_user_id;

  score := score + least(acc_count * 4,    20);
  score := score + least(doc_count * 4,    20);
  score := score + least(people_count * 10,20);
  score := score + least(inst_count * 7,   20);
  score := score + least(wish_count * 10,  10);
  score := score + least(sub_count * 5,    10);

  update public.profiles set readiness_score = score where id = p_user_id;
  return score;
end;
$function$;

-- CREATE OR REPLACE re-grants PUBLIC by default, so revoke again after it.
revoke execute on function public.recalculate_readiness(uuid) from anon, authenticated, public;
grant execute on function public.recalculate_readiness(uuid) to service_role;
