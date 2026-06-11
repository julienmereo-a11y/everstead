-- 6-month "keep your plan current" check-in.
-- Fills the re-engagement gap between onboarding (days 0-14) and the annual
-- review (month 12): a calm nudge at ~6-month intervals to keep the plan current.
--
-- plan_checkin_sent_at  — when we last sent the check-in (re-sendable every ~6 months)
-- notify_plan_checkin   — per-user opt-out (defaults to on)

alter table profiles add column if not exists plan_checkin_sent_at timestamptz;
alter table profiles add column if not exists notify_plan_checkin boolean default true;
