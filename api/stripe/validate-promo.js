import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Validate a customer-facing promotion code (e.g. "FOUNDING50") BEFORE the
// user enters card details, so we can show confirmation and decide whether to
// thread the code through to create-subscription.
//
// Returns { valid, promotionCodeId?, label?, reason? }.
// Never throws to the client — invalid codes just return { valid: false }.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code } = req.body || {}
  if (!code || typeof code !== 'string') {
    return res.status(200).json({ valid: false, reason: 'No code provided' })
  }

  try {
    const list = await stripe.promotionCodes.list({
      code: code.trim(),
      active: true,
      limit: 1,
    })

    const promo = list.data[0]
    if (!promo) {
      return res.status(200).json({ valid: false, reason: 'Code not found or no longer active' })
    }

    // Redemption limit check (the "first 50" guard)
    if (promo.max_redemptions != null && promo.times_redeemed >= promo.max_redemptions) {
      return res.status(200).json({ valid: false, reason: 'This offer has been fully claimed' })
    }

    // Expiry check
    if (promo.expires_at && promo.expires_at * 1000 < Date.now()) {
      return res.status(200).json({ valid: false, reason: 'This code has expired' })
    }

    // Build a human label from the coupon
    const coupon = promo.coupon
    let label = 'Discount applied'
    if (coupon) {
      if (coupon.percent_off === 100 && coupon.duration === 'repeating' && coupon.duration_in_months === 12) {
        label = 'Your first year is free'
      } else if (coupon.percent_off) {
        label = `${coupon.percent_off}% off`
      } else if (coupon.amount_off) {
        label = `${(coupon.amount_off / 100).toLocaleString('en-GB', { style: 'currency', currency: (coupon.currency || 'gbp').toUpperCase() })} off`
      }
    }

    return res.status(200).json({
      valid: true,
      promotionCodeId: promo.id,
      label,
      remaining: promo.max_redemptions != null ? promo.max_redemptions - promo.times_redeemed : null,
    })
  } catch (err) {
    console.error('validate-promo error:', err)
    return res.status(200).json({ valid: false, reason: 'Could not validate code' })
  }
}
