import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry } from '../lib/sentry.js'
import { translator, languageForUser, emailDate } from '../_lib/email-i18n.js'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const resend   = new Resend(process.env.RESEND_API_KEY)
const APP_URL  = process.env.VITE_APP_URL || 'https://www.everstead.care'

const PLAN_NAMES = { essential: 'Essential', family: 'Everstead+' }

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { paymentIntentId, plan, years, gifterName, gifterEmail, recipientName, recipientEmail, personalMessage, scheduledSendAt } = req.body
  if (!paymentIntentId || !plan || !years || !gifterEmail || !recipientEmail) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Verify payment succeeded
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
  if (intent.status !== 'succeeded') {
    return res.status(400).json({ error: 'Payment not confirmed' })
  }

  // Prevent duplicate confirms
  const { data: existing } = await supabase.from('gift_codes').select('id').eq('stripe_payment_intent_id', paymentIntentId).single()
  if (existing) return res.status(200).json({ ok: true, message: 'Already confirmed' })

  // Insert gift code
  const sendAt = scheduledSendAt ? new Date(scheduledSendAt) : new Date()
  // If scheduled in the past or within 5 minutes, treat as "send now"
  const sendNow = sendAt.getTime() <= Date.now() + 5 * 60 * 1000

  const { data: gift, error } = await supabase.from('gift_codes').insert({
    plan,
    years:                    Number(years),
    gifter_name:              gifterName || null,
    gifter_email:             gifterEmail,
    recipient_name:           recipientName || null,
    recipient_email:          recipientEmail,
    personal_message:         personalMessage || null,
    scheduled_send_at:        sendAt.toISOString(),
    stripe_payment_intent_id: paymentIntentId,
    amount_pence:             intent.amount,
    status:                   'pending',
    expires_at:               new Date(Date.now() + 12 * 30 * 86400000).toISOString(),
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })

  // Send gifter confirmation email.
  // This one goes to the BUYER, so it follows the buyer's own profiles.language.
  // Buying a gift needs no account, and the request carries no locale, so an
  // unknown buyer falls back to English (languageForUser's own default).
  const lang = await languageForUser(supabase, { email: gifterEmail })
  const t    = translator(COPY, lang)
  const planName   = PLAN_NAMES[plan] || plan
  const totalGBP   = (intent.amount / 100).toFixed(2)
  const deliveryStr = sendNow
    ? t('deliveryNow', { recipient: recipientName || recipientEmail })
    : t('deliveryScheduled', { date: emailDate(scheduledSendAt, lang) })

  await resend.emails.send({
    from:    'Everstead <hello@everstead.care>',
    to:      gifterEmail,
    subject: t('subjGiftConfirmed'),
    html:    gifterConfirmationHtml({ gifterName, recipientName, recipientEmail, planName, years: Number(years), totalGBP, deliveryStr, lang }),
  }).catch(console.error)

  // If send now, mark as sent immediately — cron will send recipient email
  // (cron picks up status='pending' where scheduled_send_at <= now)

  return res.status(200).json({ ok: true, code: gift.code })
}

// ─────────────────────────────────────────────────────────────
// EMAIL TEMPLATE
// ─────────────────────────────────────────────────────────────

// The buyer's receipt. Plan names (Essential, Everstead+), the amount and the
// support address never change. No em/en dashes; French carries a real
// non-breaking space (U+00A0) before : ; ! ? and %.
const COPY = {
  en: {
    subjGiftConfirmed: 'Your Everstead gift is confirmed 🎁',
    deliveryNow:       "We've sent the gift to {{recipient}} right away.",
    deliveryScheduled: "It's scheduled to arrive on {{date}}.",
    year1:             '1 year',
    yearsN:            '{{years}} years',
    h1:                'Gift confirmed, {{name}}.',
    h1NoName:          'Gift confirmed, there.',
    line1:             "You've given {{recipient}} an Everstead <strong>{{plan}}</strong> plan for <strong>{{years}}</strong>, the gift of peace of mind, at our launch offer price, guaranteed for life.",
    summaryTitle:      'Gift summary',
    rowPlan:           'Plan:',
    rowDuration:       'Duration:',
    rowFor:            'For:',
    rowTotal:          'Total paid:',
    questions:         'Questions?',
  },
  fr: {
    subjGiftConfirmed: 'Votre cadeau Everstead est confirmé 🎁',
    deliveryNow:       'Nous avons envoyé le cadeau à {{recipient}} immédiatement.',
    deliveryScheduled: 'Il arrivera le {{date}}.',
    year1:             '1 an',
    yearsN:            '{{years}} ans',
    h1:                'Cadeau confirmé, {{name}}.',
    h1NoName:          'Votre cadeau est confirmé.',
    line1:             'Vous offrez à {{recipient}} un forfait Everstead <strong>{{plan}}</strong> pour <strong>{{years}}</strong>, le cadeau de la sérénité, au tarif de lancement, garanti à vie.',
    summaryTitle:      'Récapitulatif du cadeau',
    rowPlan:           'Forfait :',
    rowDuration:       'Durée :',
    rowFor:            'Pour :',
    rowTotal:          'Total payé :',
    questions:         'Une question ?',
  },
}

// English keeps its "there" fallback in greetings; French drops the vocative
// rather than inventing one, so the greeting has a nameless twin.
const greet = (t, key, name) => (name ? t(key, { name }) : t(`${key}NoName`))

function gifterConfirmationHtml({ gifterName, recipientName, recipientEmail, planName, years, totalGBP, deliveryStr, lang }) {
  const t = translator(COPY, lang)
  const firstName = gifterName?.split(' ')[0]
  const yearsLabel = years === 1 ? t('year1') : t('yearsN', { years })
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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${greet(t, 'h1', firstName)}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">${t('line1', { recipient: recipientName || recipientEmail, plan: planName, years: yearsLabel })}</p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">${deliveryStr}</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e8e5e0;border-radius:8px;overflow:hidden;margin-bottom:32px;">
            <tr><td style="padding:16px 20px;background:#f9f8f6;">
              <p style="margin:0;color:#6b7280;font-size:13px;">${t('summaryTitle')}</p>
            </td></tr>
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 8px;color:#0d1628;font-size:14px;"><strong>${t('rowPlan')}</strong> Everstead ${planName}</p>
              <p style="margin:0 0 8px;color:#0d1628;font-size:14px;"><strong>${t('rowDuration')}</strong> ${yearsLabel}</p>
              <p style="margin:0 0 8px;color:#0d1628;font-size:14px;"><strong>${t('rowFor')}</strong> ${recipientName ? `${recipientName} (${recipientEmail})` : recipientEmail}</p>
              <p style="margin:0;color:#0d1628;font-size:14px;"><strong>${t('rowTotal')}</strong> £${totalGBP}</p>
            </td></tr>
          </table>
          <p style="margin:0;color:#9ca3af;font-size:13px;">${t('questions')} <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
