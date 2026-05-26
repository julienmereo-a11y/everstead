-- Migration: add abandoned checkout tracking columns to profiles
-- Run once in Supabase SQL editor
-- Created: 2026-05-26

-- Timestamp set when the user reaches the payment step (stripe_customer_id first written).
-- Used to gate the abandoned-checkout cron: only email users who actually started checkout.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS checkout_started_at TIMESTAMPTZ;

-- Timestamp set after the abandoned checkout email is sent.
-- Prevents duplicate sends across cron runs.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS abandoned_checkout_email_sent_at TIMESTAMPTZ;

-- Index to make the cron query fast
CREATE INDEX IF NOT EXISTS profiles_checkout_abandoned_idx
  ON profiles (checkout_started_at, abandoned_checkout_email_sent_at, stripe_subscription_id)
  WHERE checkout_started_at IS NOT NULL
    AND abandoned_checkout_email_sent_at IS NULL
    AND stripe_subscription_id IS NULL;
