import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'
import { translator, languageForUser, emailDate, pickLang } from '../_lib/email-i18n.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend  = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

const PLAN_NAMES = { essential: 'Essential', family: 'Everstead+' }

async function handler(req, res) {
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
    captureException(error, { endpoint: 'cron/gift-delivery', stage: 'query' })
    return res.status(500).json({ error: error.message })
  }

  if (!gifts?.length) {
    return res.status(200).json({ sent: 0 })
  }

  let sent = 0
  const errors = []

  for (const gift of gifts) {
    try {
      const lang = await giftLanguage(gift)
      const t    = translator(COPY, lang)
      const planName   = PLAN_NAMES[gift.plan] || gift.plan
      const yearsLabel = gift.years === 1 ? t('year1') : t('yearsN', { years: gift.years })
      const subject    = gift.gifter_name
        ? t('subjGiftFrom', { gifter: gift.gifter_name })
        : t('subjGiftAnon')

      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      gift.recipient_email,
        subject,
        html:    recipientGiftHtml({ gift, planName, yearsLabel, lang }),
      })

      await supabase.from('gift_codes').update({
        status:  'sent',
        sent_at: now.toISOString(),
      }).eq('id', gift.id)

      sent++
    } catch (err) {
      console.error(`gift-delivery error for gift ${gift.id}:`, err)
      captureException(err, { endpoint: 'cron/gift-delivery', stage: 'delivery', giftId: gift.id })
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
      const lang = await giftLanguage(gift)
      const t    = translator(COPY, lang)
      const planName   = PLAN_NAMES[gift.plan] || gift.plan
      const yearsLabel = gift.years === 1 ? t('year1') : t('yearsN', { years: gift.years })

      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      gift.recipient_email,
        subject: gift.gifter_name
          ? t('subjReminderFrom', { gifter: gift.gifter_name })
          : t('subjReminderAnon'),
        html: reminderGiftHtml({ gift, planName, yearsLabel, lang }),
      })

      await supabase.from('gift_codes')
        .update({ reminder_sent_at: now.toISOString() })
        .eq('id', gift.id)

      reminded++
    } catch (err) {
      console.error(`gift-reminder error for gift ${gift.id}:`, err)
      captureException(err, { endpoint: 'cron/gift-delivery', stage: 'reminder', giftId: gift.id })
      errors.push(`reminder ${gift.id}: ${err.message}`)
    }
  }

  console.log('gift-delivery:', { sent, reminded, errors })
  return res.status(200).json({ sent, reminded, total: gifts.length, errors })
}

// ─────────────────────────────────────────────────────────────
// LANGUAGE + EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────

/**
 * Which language a gift email is written in. gift_codes stores no language, and
 * the recipient usually has no Everstead account yet (the whole point of the
 * gift), so the preference is resolved in this order:
 *   1. the recipient's own profiles.language, if they already have an account
 *   2. the BUYER's language, so a French buyer's gift arrives in French
 *   3. English
 * languageForUser() alone cannot express step 1, because it answers 'en' both
 * for "prefers English" and for "no account", so step 1 reads the profile here.
 */
async function giftLanguage(gift) {
  return (await storedLanguage(gift.recipient_email))
    ?? await languageForUser(supabase, { email: gift.gifter_email })
}

/** A recorded language preference for an email address, or null. Never throws. */
async function storedLanguage(email) {
  try {
    if (!email) return null
    // No .catch() on a PostgREST builder: it is a thenable, not a promise.
    const { data } = await supabase
      .from('profiles')
      .select('language')
      .ilike('email', email)
      .limit(1)
      .maybeSingle()
    return data?.language ? pickLang(data.language) : null
  } catch {
    return null
  }
}

// Recipient-facing copy for both gift emails. Plan names (Essential,
// Everstead+), the redeem link and the buyer's own personal message are never
// translated. No em/en dashes; French carries a real non-breaking space
// (U+00A0) before : ; ! ? and %.
const COPY = {
  en: {
    subjGiftFrom:     '{{gifter}} has given you a gift 🎁',
    subjGiftAnon:     "You've received an Everstead gift 🎁",
    subjReminderFrom: 'A reminder: {{gifter}} sent you a gift 🎁',
    subjReminderAnon: 'You have an unclaimed Everstead gift 🎁',
    year1:            '1 year',
    yearsN:           '{{years}} years',
    someoneSpecial:   'Someone special',
    giftGiver:        'Your gift giver',
    cta:              'Claim your gift →',
    questions:        'Questions?',

    // Delivery email
    rgH1:             'A gift for you, {{name}}.',
    rgH1NoName:       'A gift for you, there.',
    rgLine1:          '<strong>{{gifter}}</strong> has given you an Everstead <strong>{{plan}}</strong> plan for <strong>{{years}}</strong>, a genuinely thoughtful gift for your peace of mind and the people you love.',
    rgBoxTitle:       'Your gift',
    rgRowPlan:        'Plan:',
    rgRowDuration:    'Duration:',
    rgNote:           'This gift is valid for 12 months. No credit card needed to get started.',

    // 7-day reminder
    remH1:            'You have an unclaimed gift, {{name}}.',
    remH1NoName:      'You have an unclaimed gift, there.',
    remLine1:         "Just a gentle reminder, <strong>{{gifter}}</strong> gave you an Everstead <strong>{{plan}}</strong> plan for <strong>{{years}}</strong> a week ago and it's waiting for you.",
    remLine2:         'It takes about 2 minutes to claim. No credit card needed.',
    remNote:          'This gift is valid until {{date}}. After that the link will expire.',
  },
  fr: {
    subjGiftFrom:     '{{gifter}} vous offre un cadeau 🎁',
    subjGiftAnon:     'Vous avez reçu un cadeau Everstead 🎁',
    subjReminderFrom: 'Petit rappel : {{gifter}} vous a offert un cadeau 🎁',
    subjReminderAnon: 'Vous avez un cadeau Everstead non réclamé 🎁',
    year1:            '1 an',
    yearsN:           '{{years}} ans',
    someoneSpecial:   'Une personne qui vous est chère',
    giftGiver:        'La personne qui vous offre ce cadeau',
    cta:              'Activer mon cadeau →',
    questions:        'Une question ?',

    rgH1:             'Un cadeau pour vous, {{name}}.',
    rgH1NoName:       'Un cadeau pour vous.',
    rgLine1:          '<strong>{{gifter}}</strong> vous offre un forfait Everstead <strong>{{plan}}</strong> pour <strong>{{years}}</strong>, un cadeau vraiment attentionné pour votre sérénité et pour ceux que vous aimez.',
    rgBoxTitle:       'Votre cadeau',
    rgRowPlan:        'Forfait :',
    rgRowDuration:    'Durée :',
    rgNote:           'Ce cadeau est valable 12 mois. Aucune carte bancaire n\'est nécessaire pour commencer.',

    remH1:            'Vous avez un cadeau non réclamé, {{name}}.',
    remH1NoName:      'Vous avez un cadeau non réclamé.',
    remLine1:         'Petit rappel, <strong>{{gifter}}</strong> vous a offert un forfait Everstead <strong>{{plan}}</strong> pour <strong>{{years}}</strong> il y a une semaine, et il vous attend toujours.',
    remLine2:         'Son activation prend environ 2 minutes. Aucune carte bancaire nécessaire.',
    remNote:          'Ce cadeau est valable jusqu\'au {{date}}. Passé cette date, le lien expirera.',
  },
}

// English keeps its "there" fallback in greetings; French drops the vocative
// rather than inventing one, so every greeting key has a nameless twin.
const greet = (t, key, name) => (name ? t(key, { name }) : t(`${key}NoName`))

function reminderGiftHtml({ gift, planName, yearsLabel, lang }) {
  const t = translator(COPY, lang)
  const recipientFirst = gift.recipient_name?.split(' ')[0]
  const gifterDisplay  = gift.gifter_name || t('someoneSpecial')
  const redeemUrl      = `${APP_URL}/redeem-gift?code=${gift.code}`
  const expiryDate     = emailDate(gift.expires_at, lang)

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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${greet(t, 'remH1', recipientFirst)}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">
            ${t('remLine1', { gifter: gifterDisplay, plan: planName, years: yearsLabel })}
          </p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">
            ${t('remLine2')}
          </p>
          <a href="${redeemUrl}"
             style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;font-family:Georgia,serif;">
            ${t('cta')}
          </a>
          <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;line-height:1.6;">
            ${t('remNote', { date: expiryDate })}
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">
            ${t('questions')} <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function recipientGiftHtml({ gift, planName, yearsLabel, lang }) {
  const t = translator(COPY, lang)
  const recipientFirst = gift.recipient_name?.split(' ')[0]
  const gifterDisplay  = gift.gifter_name || t('someoneSpecial')
  const redeemUrl      = `${APP_URL}/redeem-gift?code=${gift.code}`

  // The buyer's own words: quoted verbatim, never translated.
  const personalMessageBlock = gift.personal_message
    ? `<blockquote style="margin:24px 0;padding:16px 20px;border-left:3px solid #4c7d47;background:#f9f8f6;border-radius:0 8px 8px 0;">
        <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;font-style:italic;">"${gift.personal_message}"</p>
        <p style="margin:8px 0 0;color:#6b7280;font-size:13px;">, ${gift.gifter_name || t('giftGiver')}</p>
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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${greet(t, 'rgH1', recipientFirst)}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">
            ${t('rgLine1', { gifter: gifterDisplay, plan: planName, years: yearsLabel })}
          </p>
          ${personalMessageBlock}
          <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e8e5e0;border-radius:8px;overflow:hidden;margin:24px 0 32px;">
            <tr><td style="padding:16px 20px;background:#f9f8f6;">
              <p style="margin:0;color:#6b7280;font-size:13px;">${t('rgBoxTitle')}</p>
            </td></tr>
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 8px;color:#0d1628;font-size:14px;"><strong>${t('rgRowPlan')}</strong> Everstead ${planName}</p>
              <p style="margin:0;color:#0d1628;font-size:14px;"><strong>${t('rgRowDuration')}</strong> ${yearsLabel}</p>
            </td></tr>
          </table>
          <a href="${redeemUrl}"
             style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;font-family:Georgia,serif;">
            ${t('cta')}
          </a>
          <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
            ${t('rgNote')}
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            ${t('questions')} <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
