-- Migration: add onboarding drip email sent-at columns to profiles
-- Run once in Supabase SQL editor
-- Created: 2026-05-26
--
-- These are used by api/cron/onboarding-sequence.js to track which emails
-- have been sent to each user, preventing duplicate sends across cron runs.
-- Without these columns the cron fails silently on every run.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_email_1_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_email_2_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_email_3_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_email_4_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_email_5_sent_at TIMESTAMPTZ;
