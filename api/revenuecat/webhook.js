import { createClient } from '@supabase/supabase-js'
import { withSentry } from '../lib/sentry.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// App Store IAP product id → plan/billing_cycle. Mirrors PRICE_TO_PLAN in
// api/stripe/webhook.js, but keyed by RevenueCat/App Store product id instead
// of Stripe price id. Advisor has no IAP products (see src/config/pricing.js
// header comment) — it stays web/Stripe-only.
// Keys are the App Store / RevenueCat *product ids*. The Everstead+ products use
// `everstead_plus_*` ids (the "+" is illegal in Apple product ids, hence "_plus_");
// the plan value stays `family` — that internal plan key never changes, only the
// user-facing label ("Everstead+") and the store product id do.
const PRODUCT_TO_PLAN = {
  essential_monthly:      { plan: 'essential', billing_cycle: 'monthly' },
  essential_yearly:       { plan: 'essential', billing_cycle: 'yearly' },
  everstead_plus_monthly: { plan: 'family',    billing_cycle: 'monthly' },
  everstead_plus_yearly:  { plan: 'family',    billing_cycle: 'yearly' },
}

async function cascadeToFamilyMember(primaryUserId, { subscription_status, plan }) {
  const { data: membership } = await supabase
    .from('family_memberships')
    .select('secondary_user_id')
    .eq('primary_user_id', primaryUserId)
    .eq('invite_status', 'accepted')
    .maybeSingle()

  if (membership?.secondary_user_id) {
    await supabase
      .from('profiles')
      .update({ subscription_status, plan })
      .eq('id', membership.secondary_user_id)
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // RevenueCat signs webhooks with a static bearer token you set in the RC
  // dashboard (Project Settings > Integrations > Webhooks), not an HMAC
  // signature like Stripe — a normal parsed JSON body is fine here.
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN}`) {
    return res.status(401).end()
  }

  const event = req.body?.event
  if (!event) return res.status(400).json({ error: 'Missing event' })

  // app_user_id is set to the Supabase auth.users.id at Purchases.configure()/
  // logIn() time on the client (see src/contexts/AuthContext.jsx) — that makes
  // it the join key here, with revenuecat_app_user_id kept for defense-in-depth.
  // TRANSFER events carry no app_user_id — the new owner is in transferred_to.
  const appUserId  = event.app_user_id || event.transferred_to?.[0]
  const productId  = event.product_id
  const planInfo   = PRODUCT_TO_PLAN[productId] || {}
  const periodType = event.period_type // 'TRIAL' | 'NORMAL' | 'INTRO'

  const currentPeriodEnd = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null

  let profileUpdate = null

  switch (event.type) {
    case 'INITIAL_PURCHASE':
      profileUpdate = {
        subscription_status:  periodType === 'TRIAL' ? 'trialing' : 'active',
        entitlement_source:   'apple_iap',
        revenuecat_app_user_id: appUserId,
        apple_original_transaction_id: event.original_transaction_id || null,
        current_period_end:  currentPeriodEnd,
        trial_ends_at:        periodType === 'TRIAL' ? currentPeriodEnd : null,
        ...planInfo,
      }
      break

    case 'RENEWAL':
      profileUpdate = {
        subscription_status: 'active',
        current_period_end:  currentPeriodEnd,
        ...planInfo,
      }
      break

    case 'PRODUCT_CHANGE':
      profileUpdate = {
        subscription_status: 'active',
        current_period_end:  currentPeriodEnd,
        ...planInfo,
      }
      break

    case 'CANCELLATION':
      profileUpdate = {
        subscription_status: 'cancelling',
        cancel_at:            currentPeriodEnd,
      }
      break

    case 'EXPIRATION':
      // Back to the free tier explicitly. plan:null would FAIL OPEN — the
      // canUseFeature() gate, the messages RLS backstop and the free-tier caps
      // all treat an unknown plan permissively, so an expired subscriber would
      // keep every paid feature.
      // NB: billing_cycle is NOT NULL with CHECK(monthly|yearly) — never null
      // it here; a stale value on a free plan is harmless.
      profileUpdate = {
        subscription_status: 'cancelled',
        plan:                 'free',
        current_period_end:   null,
        cancel_at:             null,
      }
      break

    case 'BILLING_ISSUE':
      profileUpdate = { subscription_status: 'past_due' }
      break

    case 'UNCANCELLATION':
      profileUpdate = { subscription_status: 'active', cancel_at: null }
      break

    case 'TRANSFER':
    case 'SUBSCRIBER_ALIAS':
      // No entitlement change — just reconcile identifiers if they moved.
      profileUpdate = {
        revenuecat_app_user_id: appUserId,
        apple_original_transaction_id: event.original_transaction_id || null,
      }
      break

    default:
      return res.status(200).json({ received: true, ignored: event.type })
  }

  if (!appUserId) return res.status(200).json({ received: true, ignored: 'no app_user_id' })

  // id.eq.<value> casts to uuid — a $RCAnonymousID:… app_user_id would make the
  // whole filter error (→ 500 → RevenueCat retries forever). Only match on the
  // uuid column when the value actually is a uuid.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appUserId)
  const matcher = isUuid
    ? `revenuecat_app_user_id.eq.${appUserId},id.eq.${appUserId}`
    : `revenuecat_app_user_id.eq.${appUserId}`
  const { data: updatedProfiles, error: updateError } = await supabase
    .from('profiles')
    .update(profileUpdate)
    .or(matcher)
    .select('id, subscription_status, plan')

  // A failed write must NOT be acknowledged — return 500 so RevenueCat retries,
  // otherwise a paid purchase could be dropped on a transient DB error.
  if (updateError) {
    console.error('revenuecat webhook: profile update failed:', updateError.message)
    return res.status(500).json({ error: 'profile update failed' })
  }

  if (updatedProfiles?.[0]?.id) {
    await cascadeToFamilyMember(updatedProfiles[0].id, {
      subscription_status: updatedProfiles[0].subscription_status,
      plan:                updatedProfiles[0].plan,
    })
  }

  return res.status(200).json({ received: true })
}

export default withSentry(handler)
