import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend  = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

// Plan display config — mirrors PLAN_OPTIONS in GetStarted.jsx
const PLAN_META = {
  essential: {
    label:    'Essential',
    price:    '£3/month (billed yearly) or £5/month',
    features: ['Up to 10 accounts & documents', '1 trusted contact', '1 GB storage'],
  },
  family: {
    label:    'Family',
    price:    '£10/month (billed yearly) or £12/month',
    features: ['Two private vaults — one subscription', 'Share only what you choose', '10 trusted contacts', '25 GB storage'],
  },
  advisor: {
    label:    'Advisor',
    price:    '£48/month (billed yearly) or £60/month',
    features: ['Multi-client workspace', 'Co-branded portal', 'Client dashboards', '100 GB storage'],
  },
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth — Vercel Cron sends this header automatically when CRON_SECRET is set
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = new Date()
  // Email window: 1 hour after checkout started, up to 48 hours
  // (after 48h the lead is cold; no point emailing)
  const oneHourAgo      = new Date(now.getTime() -  1 * 60 * 60 * 1000).toISOString()
  const fortyEightHrsAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

  // Target: users who reached the payment step (have a stripe_customer_id stamped
  // by setup-intent) but never completed checkout (no stripe_subscription_id yet),
  // and haven't been sent this email yet.
  const { data: abandoned, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, plan, billing_cycle, checkout_started_at')
    .not('stripe_customer_id', 'is', null)       // reached payment step
    .is('stripe_subscription_id', null)           // never completed checkout
    .is('abandoned_checkout_email_sent_at', null) // not already emailed
    .not('email', 'is', null)                     // has an email address
    .neq('role', 'delegate')                      // not a delegate user
    .lte('checkout_started_at', oneHourAgo)       // started > 1h ago
    .gte('checkout_started_at', fortyEightHrsAgo) // started < 48h ago

  if (error) {
    console.error('[abandoned-checkout] query error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!abandoned?.length) {
    return res.status(200).json({ sent: 0 })
  }

  const results = await Promise.allSettled(
    abandoned.map(async (user) => {
      await resend.emails.send({
        from:    'Julien at Everstead <hello@everstead.care>',
        to:      user.email,
        subject: `${user.full_name?.split(' ')[0] || 'Your'} Everstead trial is ready — one step left`,
        html:    buildEmail(user),
      })

      await supabase
        .from('profiles')
        .update({ abandoned_checkout_email_sent_at: new Date().toISOString() })
        .eq('id', user.id)
    })
  )

  const sent   = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  const errors = results
    .filter(r => r.status === 'rejected')
    .map(r => r.reason?.message)

  if (failed) console.error('[abandoned-checkout] send failures:', errors)
  console.log(`[abandoned-checkout] sent=${sent} failed=${failed} total=${abandoned.length}`)

  return res.status(200).json({ sent, failed, total: abandoned.length })
}

// ─────────────────────────────────────────────────────────────
// EMAIL TEMPLATE
// ─────────────────────────────────────────────────────────────
function buildEmail(user) {
  const firstName = user.full_name?.split(' ')[0] || 'there'
  const plan      = PLAN_META[user.plan] ?? PLAN_META.essential
  const resumeUrl = `${APP_URL}/get-started?resume=true`

  const featureRows = plan.features
    .map(f => `
      <tr>
        <td style="padding:5px 0;color:#4a5568;font-size:15px;line-height:1.6;">
          <span style="color:#4c7d47;margin-right:10px;">✓</span>${f}
        </td>
      </tr>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Everstead trial is waiting</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f4f0;padding:48px 0;">
    <tr><td align="center" style="padding:0 16px;">

      <table width="560" cellpadding="0" cellspacing="0" role="presentation"
             style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:560px;width:100%;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr>
          <td style="background:#0d1628;padding:32px 40px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-family:Georgia,serif;font-size:22px;font-weight:normal;letter-spacing:0.5px;">Everstead</p>
            <p style="margin:6px 0 0;color:#94a3b8;font-size:12px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">Estate planning, done thoughtfully</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:44px 40px 36px;">

            <h1 style="margin:0 0 20px;color:#0d1628;font-family:Georgia,serif;font-size:26px;font-weight:normal;line-height:1.35;">
              ${firstName}, your free trial is still here.
            </h1>

            <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
              You chose the <strong>${plan.label}</strong> plan and created your account — but didn't quite finish. Your 14-day free trial is still reserved for you.
            </p>

            <p style="margin:0 0 28px;color:#4a5568;font-size:16px;line-height:1.7;">
              All you need to do is add your card. You won't be charged for 14&nbsp;days, and you can cancel any time before then.
            </p>

            <!-- Plan summary box -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                   style="background:#f8f7f5;border:1px solid #e8e5e0;border-radius:10px;margin-bottom:32px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;color:#0d1628;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;">${plan.label} plan</p>
                  <p style="margin:0 0 14px;color:#9ca3af;font-size:13px;">${plan.price} · 14-day free trial included</p>
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    ${featureRows}
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
              <tr>
                <td style="border-radius:8px;background:#4c7d47;">
                  <a href="${resumeUrl}"
                     style="display:inline-block;padding:15px 32px;color:#ffffff;font-family:Georgia,serif;font-size:16px;font-weight:normal;text-decoration:none;border-radius:8px;letter-spacing:0.01em;">
                    Complete my free trial →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;color:#6b7280;font-size:15px;line-height:1.6;">
              It takes about 30 seconds — your account and details are already saved.
            </p>

            <p style="margin:28px 0 0;color:#6b7280;font-size:15px;line-height:1.6;">
              — Julien, founder of Everstead
            </p>

          </td>
        </tr>

        <!-- Trust strip -->
        <tr>
          <td style="background:#f8f7f5;padding:20px 40px;border-top:1px solid #e8e5e0;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="color:#9ca3af;font-size:13px;text-align:center;">
                  🔒 AES-256 encryption &nbsp;·&nbsp; No charge for 14 days &nbsp;·&nbsp; Cancel any time
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #e8e5e0;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;text-align:center;">
              Questions? Reply to this email or write to
              <a href="mailto:hello@everstead.care" style="color:#4c7d47;text-decoration:none;">hello@everstead.care</a>
              <br>
              EVERSTEAD DIGITAL LTD · London, England, United Kingdom
              <br><br>
              <a href="mailto:hello@everstead.care?subject=Unsubscribe%20from%20checkout%20reminders"
                 style="color:#9ca3af;text-decoration:underline;">Unsubscribe from these emails</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
