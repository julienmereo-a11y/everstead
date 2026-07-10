// Server-safe plan-key → customer-facing label, for email copy.
//
// This intentionally duplicates PLAN_LABELS from src/config/pricing.js: that module
// reads import.meta.env at load time (for the Stripe price IDs), which is undefined in
// the Node runtime that renders/sends emails and would throw on import. Keep the two in
// step — pricing.js is the source of truth for the labels themselves.
export const emailPlanLabel = (plan) => ({
  free:      'Everstead',
  essential: 'Essential',
  family:    'Everstead+',
  advisor:   'Everstead Pro',
}[plan] || plan || 'Everstead')
