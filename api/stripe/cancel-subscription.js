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
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  // ── Suspend user (admin only) ─────────────────────────────────
  if (action === 'suspend-user') {
    try {
      await supabase.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
      await supabase.from('profiles').update({ is_suspended: true }).eq('id', userId)
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('suspend-user error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  // ── Unsuspend user (admin only) ───────────────────────────────
  if (action === 'unsuspend-user') {
    try {
      await supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' })
      await supabase.from('profiles').update({ is_suspended: false }).eq('id', userId)
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('unsuspend-user error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  // ── Trial extension (admin only) ──────────────────────────────
  if (action === 'extend-trial') {
    try {
      const extendDays = parseInt(days, 10) || 7
      let finalTrialEnd // Unix seconds

      if (subscriptionId) {
        // Extend from current Stripe trial_end (or now if already expired)
        const currentSub = await stripe.subscriptions.retrieve(subscriptionId)
        const baseTime = (currentSub.trial_end && currentSub.trial_end > Math.floor(Date.now() / 1000))
          ? currentSub.trial_end
          : Math.floor(Date.now() / 1000)
        finalTrialEnd = baseTime + extendDays * 86400
        await stripe.subscriptions.update(subscriptionId, { trial_end: finalTrialEnd })
      } else {
        // No Stripe subscription — extend from current trial_ends_at or now
        const { data: profile } = await supabase.from('profiles').select('trial_ends_at').eq('id', userId).single()
        const currentEnd = profile?.trial_ends_at ? new Date(profile.trial_ends_at).getTime() / 1000 : null
        const baseTime = (currentEnd && currentEnd > Math.floor(Date.now() / 1000))
          ? currentEnd
          : Math.floor(Date.now() / 1000)
        finalTrialEnd = baseTime + extendDays * 86400
      }

      const trialEndsAt = new Date(finalTrialEnd * 1000).toISOString()
      await supabase.from('profiles').update({
        trial_ends_at: trialEndsAt,
        subscription_status: 'trialing',
      }).eq('id', userId)

      // Email the user
      const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', userId).single()
      if (profile?.email) {
        const endDate = new Date(finalTrialEnd * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        await resend.emails.send({
          from:    'Everstead <hello@everstead.care>',
          to:      profile.email,
          subject: `Good news — your Everstead trial has been extended`,
          html:    trialExtendedHtml(profile.full_name, extendDays, endDate),
        }).catch(console.error)
      }

      return res.status(200).json({ success: true, trialEndsAt })
    } catch (err) {
      console.error('extend-trial error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  if (!subscriptionId) return res.status(400).json({ error: 'Missing subscriptionId' })

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
        from:    'Everstead <hello@everstead.care>',
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

function trialExtendedHtml(name, days, endDate) {
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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">Good news, ${name || 'there'}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            We've extended your Everstead free trial by <strong>${days} days</strong>. Your trial now runs until <strong>${endDate}</strong> — no action needed on your end.
          </p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
            Use the extra time to get your estate plan in order. If you have any questions or need help getting started, just reply to this email.
          </p>
          <a href="${process.env.VITE_APP_URL}/dashboard" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Go to your dashboard →</a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">Questions? <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
