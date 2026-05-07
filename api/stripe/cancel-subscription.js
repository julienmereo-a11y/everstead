import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { subscriptionId, userId } = req.body
  if (!subscriptionId || !userId) {
    return res.status(400).json({ error: 'Missing subscriptionId or userId' })
  }

  try {
    // Cancel at period end — user keeps full access until their billing cycle ends
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    const periodEnd = subscription.current_period_end
    const periodEndDate = periodEnd
      ? new Date(periodEnd * 1000).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      : null

    // Mark profile as cancelling (still active until period ends)
    await supabase
      .from('profiles')
      .update({ subscription_status: 'cancelling' })
      .eq('id', userId)

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
        html:    cancellationHtml(firstName, periodEndDate),
      }).catch(console.error)
    }

    res.status(200).json({ success: true, periodEnd, periodEndDate })
  } catch (err) {
    console.error('cancel-subscription error:', err)
    res.status(500).json({ error: err.message })
  }
}

function cancellationHtml(firstName, periodEndDate) {
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
            We've confirmed the cancellation of your Everstead plan.${periodEndDate ? ` You'll keep full access until <strong>${periodEndDate}</strong> — nothing changes until then.` : ' You\'ll keep full access until the end of your current billing period.'}
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
