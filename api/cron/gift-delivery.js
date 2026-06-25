import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend  = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

const PLAN_NAMES = { essential: 'Essential', family: 'Family' }

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = new Date()

  // Fetch pending gifts where scheduled_send_at <= now
  const { data: gifts, error } = await supabase
    .from('gift_codes')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_send_at', now.toISOString())

  if (error) {
    console.error('gift-delivery query error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!gifts?.length) {
    return res.status(200).json({ sent: 0 })
  }

  let sent = 0
  const errors = []

  for (const gift of gifts) {
    try {
      const planName   = PLAN_NAMES[gift.plan] || gift.plan
      const yearsLabel = gift.years === 1 ? '1 year' : `${gift.years} years`
      const subject    = gift.gifter_name
        ? `${gift.gifter_name} has given you a gift 🎁`
        : "You've received an Everstead gift 🎁"

      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      gift.recipient_email,
        subject,
        html:    recipientGiftHtml({ gift, planName, yearsLabel }),
      })

      await supabase.from('gift_codes').update({
        status:  'sent',
        sent_at: now.toISOString(),
      }).eq('id', gift.id)

      sent++
    } catch (err) {
      console.error(`gift-delivery error for gift ${gift.id}:`, err)
      errors.push(`${gift.id}: ${err.message}`)
    }
  }

  // ── Step 2: 7-day reminder for unredeemed gifts ──────────────────
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString()

  const { data: toRemind } = await supabase
    .from('gift_codes')
    .select('*')
    .eq('status', 'sent')
    .is('reminder_sent_at', null)
    .lte('sent_at', sevenDaysAgo)

  let reminded = 0

  for (const gift of toRemind ?? []) {
    try {
      const planName   = PLAN_NAMES[gift.plan] || gift.plan
      const yearsLabel = gift.years === 1 ? '1 year' : `${gift.years} years`

      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      gift.recipient_email,
        subject: gift.gifter_name
          ? `A reminder: ${gift.gifter_name} sent you a gift 🎁`
          : "You have an unclaimed Everstead gift 🎁",
        html: reminderGiftHtml({ gift, planName, yearsLabel }),
      })

      await supabase.from('gift_codes')
        .update({ reminder_sent_at: now.toISOString() })
        .eq('id', gift.id)

      reminded++
    } catch (err) {
      console.error(`gift-reminder error for gift ${gift.id}:`, err)
      errors.push(`reminder ${gift.id}: ${err.message}`)
    }
  }

  console.log('gift-delivery:', { sent, reminded, errors })
  return res.status(200).json({ sent, reminded, total: gifts.length, errors })
}

function reminderGiftHtml({ gift, planName, yearsLabel }) {
  const recipientFirst = gift.recipient_name?.split(' ')[0] || 'there'
  const gifterDisplay  = gift.gifter_name || 'Someone special'
  const redeemUrl      = `${APP_URL}/redeem-gift?code=${gift.code}`
  const expiryDate     = new Date(gift.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:32px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="150" style="display:block;margin:0 auto;height:auto;max-width:150px;" />
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">You have an unclaimed gift, ${recipientFirst}.</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">
            Just a gentle reminder — <strong>${gifterDisplay}</strong> gave you an Everstead <strong>${planName}</strong> plan for <strong>${yearsLabel}</strong> a week ago and it's waiting for you.
          </p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">
            It takes about 2 minutes to claim. No credit card needed.
          </p>
          <a href="${redeemUrl}"
             style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;font-family:Georgia,serif;">
            Claim your gift →
          </a>
          <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;line-height:1.6;">
            This gift is valid until ${expiryDate}. After that the link will expire.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">
            Questions? <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function recipientGiftHtml({ gift, planName, yearsLabel }) {
  const recipientFirst = gift.recipient_name?.split(' ')[0] || 'there'
  const gifterDisplay  = gift.gifter_name || 'Someone special'
  const redeemUrl      = `${APP_URL}/redeem-gift?code=${gift.code}`

  const personalMessageBlock = gift.personal_message
    ? `<blockquote style="margin:24px 0;padding:16px 20px;border-left:3px solid #4c7d47;background:#f9f8f6;border-radius:0 8px 8px 0;">
        <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;font-style:italic;">"${gift.personal_message}"</p>
        <p style="margin:8px 0 0;color:#6b7280;font-size:13px;">— ${gift.gifter_name || 'Your gift giver'}</p>
      </blockquote>`
    : ''

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:32px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="150" style="display:block;margin:0 auto;height:auto;max-width:150px;" />
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">A gift for you, ${recipientFirst}.</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">
            <strong>${gifterDisplay}</strong> has given you an Everstead <strong>${planName}</strong> plan for <strong>${yearsLabel}</strong> — a genuinely thoughtful gift for your peace of mind and the people you love.
          </p>
          ${personalMessageBlock}
          <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e8e5e0;border-radius:8px;overflow:hidden;margin:24px 0 32px;">
            <tr><td style="padding:16px 20px;background:#f9f8f6;">
              <p style="margin:0;color:#6b7280;font-size:13px;">Your gift</p>
            </td></tr>
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 8px;color:#0d1628;font-size:14px;"><strong>Plan:</strong> Everstead ${planName}</p>
              <p style="margin:0;color:#0d1628;font-size:14px;"><strong>Duration:</strong> ${yearsLabel}</p>
            </td></tr>
          </table>
          <a href="${redeemUrl}"
             style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;font-family:Georgia,serif;">
            Claim your gift →
          </a>
          <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
            This gift is valid for 12 months. No credit card needed to get started.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            Questions? <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}
