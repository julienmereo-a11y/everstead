-- Phase B push notifications: Postgres → pg_net webhooks → /api/push/event.
--
-- NOT YET APPLIED. Apply AFTER (1) the /api/push/* endpoints are deployed and
-- (2) PUSH_WEBHOOK_SECRET + ONESIGNAL_* env vars exist in Vercel.
--
-- ⚠️ The repo is PUBLIC: this file keeps a __PUSH_WEBHOOK_SECRET__ placeholder.
-- Substitute the real secret ONLY at apply time (SQL editor / MCP), never commit it.
--
-- Events pushed to the owner's phone (things local notifications can't know):
--   • alerts INSERT                        → new alert
--   • trusted_people invite_status→accepted → invite accepted

create extension if not exists pg_net;

create or replace function public.notify_push_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Fire-and-forget; a failed webhook must never block the write itself.
  perform net.http_post(
    url     := 'https://www.everstead.care/api/push/event',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', '__PUSH_WEBHOOK_SECRET__'
    ),
    body    := jsonb_build_object('table', TG_TABLE_NAME, 'type', TG_OP, 'record', to_jsonb(NEW))
  );
  return NEW;
end;
$$;

drop trigger if exists push_on_alert_insert on public.alerts;
create trigger push_on_alert_insert
  after insert on public.alerts
  for each row execute function public.notify_push_event();

drop trigger if exists push_on_invite_accepted on public.trusted_people;
create trigger push_on_invite_accepted
  after update on public.trusted_people
  for each row
  when (old.invite_status is distinct from new.invite_status and new.invite_status = 'accepted')
  execute function public.notify_push_event();
