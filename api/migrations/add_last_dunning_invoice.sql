-- Applied 2026-07-08. Dedup key for the "payment failed" (dunning) email.
-- Stripe re-emits invoice.payment_failed on EVERY dunning retry of the same invoice,
-- and the webhook was emailing on each one (a customer with a failing card got one
-- "payment failed" email per retry — 8+ in a cycle). We now store the invoice id we
-- last emailed about so exactly one notice is sent per failed invoice/cycle. The
-- subscription_status is still refreshed on every event; only the email is deduped.
alter table public.profiles add column if not exists last_dunning_invoice text;
