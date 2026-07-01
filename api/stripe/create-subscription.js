import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)
const FOUNDER_TO = process.env.FEEDBACK_TO || 'julien@everstead.care'

// Alert the founder when someone completes a subscription. Best-effort — a failure
// here never blocks the subscription. Founding members (FOUNDING50) are flagged.
async function notifyFounderOfSubscription({ name, email, plan, billingCycle, isFounding }) {
  try {
    const when = new Date().toLocaleString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
    })
    const row = (k, v) => `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;width:140px;">${k}</td><td style="padding:6px 0;color:#0d1628;font-size:14px;font-weight:500;">${v}</td></tr>`
    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      FOUNDER_TO,
      replyTo: email || undefined,
      subject: isFounding
        ? `🎉 New FOUNDING member — ${name || email}`
        : `💳 New subscription — ${name || email} (${plan})`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px;background:#f9fafb;font-family:system-ui,sans-serif;">
  <table style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <tr><td style="background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:20px 24px;"><p style="margin:0;color:#fff;font-size:16px;font-weight:600;">${isFounding ? 'New founding member 🎉' : 'New subscription'}</p></td></tr>
    <tr><td style="padding:22px 24px;"><table style="width:100%;border-collapse:collapse;">
      ${row('Name', name || '—')}
      ${row('Email', email || '—')}
      ${row('Plan', `${plan || 'essential'} · ${billingCycle || 'monthly'}`)}
      ${row('Founding member', isFounding ? 'Yes — FOUNDING50 (first year free)' : 'No')}
      ${row('Subscribed', when)}
    </table></td></tr>
  </table>
</body></html>`,
    })
  } catch (err) {
    console.error('[create-subscription] founder notification failed:', err)
  }
}

const PRICE_IDS = {
  essential: { monthly: process.env.VITE_STRIPE_ESSENTIAL_MONTHLY, yearly: process.env.VITE_STRIPE_ESSENTIAL_YEARLY },
  family:    { monthly: process.env.VITE_STRIPE_FAMILY_MONTHLY,    yearly: process.env.VITE_STRIPE_FAMILY_YEARLY    },
  advisor:   { monthly: process.env.VITE_STRIPE_ADVISOR_MONTHLY,   yearly: process.env.VITE_STRIPE_ADVISOR_YEARLY   },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { customerId, paymentMethodId, plan, billingCycle, userId, trialPeriodDays = 14, referredBy, promoCode } = req.body
  if (!customerId || !paymentMethodId || !plan || !billingCycle || !userId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const priceId = PRICE_IDS[plan]?.[billingCycle]
  if (!priceId) return res.status(400).json({ error: `No price ID for plan "${plan}" (${billingCycle})` })

  try {
    // Attach the confirmed payment method to the customer and set as default
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    // Resolve an optional promotion code (e.g. FOUNDING50) to its ID.
    // Best-effort: if the code is invalid/exhausted we proceed WITHOUT the
    // discount rather than failing the signup after the card is confirmed.
    let promotionCodeId = null
    let couponFullyFree = false // a 100%-off promo (e.g. FOUNDING50) IS the free period
    // Members who register with the FOUNDING50 code become founding members.
    const isFoundingMember = !!promoCode && String(promoCode).trim().toUpperCase() === 'FOUNDING50'
    if (promoCode) {
      try {
        const list = await stripe.promotionCodes.list({
          code: String(promoCode).trim(), active: true, limit: 1, expand: ['data.coupon'],
        })
        const promo = list.data[0]
        const exhausted = promo?.max_redemptions != null && promo.times_redeemed >= promo.max_redemptions
        const expired   = promo?.expires_at && promo.expires_at * 1000 < Date.now()
        if (promo && !exhausted && !expired) {
          promotionCodeId = promo.id
          couponFullyFree = promo.coupon?.percent_off === 100
        }
      } catch (e) {
        console.error('create-subscription promo lookup failed:', e.message)
      }
    }

    // Now create the subscription — card is confirmed so no payment risk.
    // A 100%-off promo (FOUNDING50 = first year free) REPLACES the trial: the
    // discounted period is the free time, so adding a 14-day trial on top just
    // makes Stripe show a "14-day trial" instead of the free year. We drop the
    // trial only when Stripe confirms the coupon is genuinely 100% off, so a
    // misconfigured/partial coupon can never turn the trial off and surprise-charge.
    const subParams = {
      customer:        customerId,
      items:           [{ price: priceId }],
      default_payment_method: paymentMethodId,
      metadata: {
        plan,
        billing_cycle: billingCycle,
        user_id:       userId,
        ...(referredBy ? { referred_by: referredBy } : {}),
        ...(promotionCodeId ? { promo_code: String(promoCode).trim() } : {}),
      },
    }
    if (!couponFullyFree) subParams.trial_period_days = trialPeriodDays
    if (promotionCodeId) subParams.discounts = [{ promotion_code: promotionCodeId }]

    let subscription
    try {
      subscription = await stripe.subscriptions.create(subParams)
    } catch (e) {
      // If the discount raced to its redemption limit between validation and
      // now, retry once without it so the user still gets an account.
      if (promotionCodeId) {
        console.error('create-subscription with discount failed, retrying without:', e.message)
        delete subParams.discounts
        delete subParams.metadata.promo_code
        subscription = await stripe.subscriptions.create(subParams)
      } else {
        throw e
      }
    }

    const isTrialing      = subscription.status === 'trialing'
    const trialEndsAt     = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null

    // Sync subscription to profile immediately (webhook will also fire)
    await supabase.from('profiles').update({
      stripe_subscription_id: subscription.id,
      stripe_price_id:        subscription.items.data[0]?.price?.id,
      subscription_status:    isTrialing ? 'trialing' : 'active',
      plan,
      billing_cycle:          billingCycle,
      trial_ends_at:          trialEndsAt,
      current_period_end:     currentPeriodEnd,
      ...(referredBy ? { referred_by: referredBy } : {}),
    }).eq('id', userId)

    // Tag founding members (registered with FOUNDING50) as a separate best-effort
    // write, so it can never break the core profile sync above.
    if (isFoundingMember && promotionCodeId) {
      const { error: foundingErr } = await supabase
        .from('profiles').update({ is_founding_member: true }).eq('id', userId)
      if (foundingErr) console.error('could not set is_founding_member:', foundingErr.message)
    }

    // Founder alert — someone actually subscribed (flag founding members).
    try {
      const { data: prof } = await supabase.from('profiles').select('full_name, email').eq('id', userId).single()
      await notifyFounderOfSubscription({
        name: prof?.full_name, email: prof?.email,
        plan, billingCycle, isFounding: !!(isFoundingMember && promotionCodeId),
      })
    } catch { /* non-blocking */ }

    return res.status(200).json({ subscriptionId: subscription.id, status: subscription.status })
  } catch (err) {
    console.error('create-subscription error:', err)
    return res.status(500).json({ error: err.message })
  }
}
