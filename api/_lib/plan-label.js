// Server-safe plan-key → customer-facing label for API/email/cron copy.
//
// Mirrors PLAN_LABELS in src/config/pricing.js, which can't be imported here: that
// module reads import.meta.env at load time (for Stripe price IDs) and would throw in
// the Node serverless runtime. Keep the labels in step with pricing.js.
export const planLabel = (plan) => ({
  free:      'Everstead',
  essential: 'Essential',
  family:    'Everstead+',
  advisor:   'Everstead Pro',
}[plan] || plan || 'Everstead')
