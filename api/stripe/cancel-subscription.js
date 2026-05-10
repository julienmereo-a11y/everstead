import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { subscriptionId, userId, action, days } = req.body
  if (!subscriptionId || !userId) {
    return res.status(400).json({ error: 'Missing subscriptionId or userId' })
  }

  // ── Trial extension (admin only) ──────────────────────────────
  if (action === 'extend-trial') {
    try {
      const extendDays = parseInt(days, 10) || 7
      // Fetch current sub to get current trial_end (extend from there, not from now)
      const currentSub = await stripe.subscriptions.retrieve(subscriptionId)
      const baseTime = (currentSub.trial_end && currentSub.trial_end > Math.floor(Date.now() / 1000))
        ? currentSub.trial_end
        : Math.floor(Date.now() / 1000)
      const newTrialEnd = baseTime + extendDays * 86400

      await stripe.subscriptions.update(subscriptionId, { trial_end: newTrialEnd })
      await supabase.from('profiles').update({
        trial_ends_at: new Date(newTrialEnd * 1000).toISOString(),
        subscription_status: 'trialing',
      }).eq('id', userId)

      return res.status(200).json({ success: true, trialEndsAt: new Date(newTrialEnd * 1000).toISOString() })
    } catch (err) {
      console.error('extend-trial error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  // ── Reactivation ──────────────────────────────────────────────
  // Undo a previously scheduled cancellation while still in the billing period.
  if (action === 'reactivate') {
    try {
      // Fetch updated subscription from Stripe to get the real status
      // (trialing users who reactivate should stay 'trialing', not become 'active')
      const sub = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      })
      const reactivatedStatus = sub.status === 'trialing' ? 'trialing' : 'active'

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ subscription_status: reactivatedStatus, cancel_at: null })
        .eq('id', userId)
      if (dbError) console.error('reactivate-subscription DB update error:', dbError)

      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('reactivate-subscription error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  // ── Cancellation ─────────────────────────────────────────────
  // Default action: schedule cancellation at period end.
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    // cancel_at is the Unix timestamp when access actually ends
    const cancelAt      = subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : null
    const periodEnd     = subscription.current_period_end
    const periodEndDate = periodEnd
      ? new Date(periodEnd * 1000).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      : null
    const cancelAtDate  = cancelAt
      ? new Date(cancelAt).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      : periodEndDate

    // Mark profile as cancelling and store the exact access-end timestamp
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ subscription_status: 'cancelling', cancel_at: cancelAt })
      .eq('id', userId)
    if (dbError) console.error('cancel-subscription DB update error:', dbError)

    // Fetch profile for the email
    const { data: profiles } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single()

    if (profiles?.email) {
      const firstName = profiles.full_name?.split(' ')[0] || 'there'
      await resend.emails.send({
        from:    'Everstead <support@everstead.care>',
        to:      profiles.email,
        subject: `We're sorry to see you go, ${firstName}.`,
        html:    cancellationHtml(firstName, cancelAtDate ?? periodEndDate),
      }).catch(console.error)
    }

    res.status(200).json({ success: true, cancelAt, cancelAtDate: cancelAtDate ?? periodEndDate, periodEnd, periodEndDate })
  } catch (err) {
    console.error('cancel-subscription error:', err)
    res.status(500).json({ error: err.message })
  }
}

function cancellationHtml(firstName, accessEndDate) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#0d1628;padding:28px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 20px;color:#0d1628;font-size:24px;font-weight:normal;">We're sorry to see you go, ${firstName}.</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            We've confirmed the cancellation of your Everstead plan.${accessEndDate ? ` You'll keep full access until <strong>${accessEndDate}</strong> — nothing changes until then.` : " You'll keep full access until the end of your current billing period."}
          </p>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            We built Everstead because we believe every family deserves clarity, not chaos. We're sorry we didn't get the chance to be part of yours.
          </p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
            If you have a moment, we'd genuinely love to hear from you. What could we have done better? Was there something missing? Your feedback — even just a sentence — would mean a lot to us and help us build something better for the next family.
          </p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
            If you ever change your mind, your account will be here. We'll keep your data safe for 30 days.
          </p>
          <p style="margin:0 0 0;color:#6b7280;font-size:15px;line-height:1.6;font-style:italic;">With thanks for giving us a try.<br>The Everstead team</p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">Reply to this email or write to <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a> with any feedback.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
