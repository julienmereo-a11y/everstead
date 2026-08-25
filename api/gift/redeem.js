import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'
import { translator, languageForUser, emailDate, pickLang } from '../_lib/email-i18n.js'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const resend   = new Resend(process.env.RESEND_API_KEY)
const APP_URL  = process.env.VITE_APP_URL || 'https://www.everstead.care'

const PRICE_IDS = {
  essential: { yearly: process.env.VITE_STRIPE_ESSENTIAL_YEARLY },
  family:    { yearly: process.env.VITE_STRIPE_FAMILY_YEARLY    },
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // The gift is attached to the AUTHENTICATED caller — never a client-supplied userId
  // (which previously let a code-holder redeem onto any account).
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' })
  const userId = user.id

  const { code, name } = req.body
  const email = req.body.email || user.email
  if (!code || !email) return res.status(400).json({ error: 'Missing fields' })

  // Validate code
  const { data: gift } = await supabase.from('gift_codes').select('*').eq('code', code).single()
  if (!gift) return res.status(404).json({ error: 'Gift code not found.' })
  if (gift.status === 'redeemed') return res.status(400).json({ error: 'This gift has already been redeemed.' })
  if (gift.status === 'expired' || new Date(gift.expires_at) < new Date()) return res.status(400).json({ error: 'This gift link has expired.' })

  const priceId = PRICE_IDS[gift.plan]?.yearly
  if (!priceId) return res.status(400).json({ error: 'Invalid plan on gift code.' })

  // Atomically claim the code BEFORE any Stripe work. The `redeemed_by is null` guard
  // serialises concurrent redeems at the row level — only one caller can win the race,
  // so a single gift can't be double-spent. Rolled back below if Stripe then fails.
  const prevStatus = gift.status
  const { data: claimed } = await supabase.from('gift_codes')
    .update({ status: 'redeemed', redeemed_at: new Date().toISOString(), redeemed_by: userId })
    .eq('id', gift.id)
    .is('redeemed_by', null)
    .select('id')
  if (!claimed || claimed.length === 0) {
    return res.status(400).json({ error: 'This gift has already been redeemed.' })
  }

  try {
    // Create Stripe customer for recipient
    const customer = await stripe.customers.create({ email, name: name || undefined })

    // Create subscription with long trial = years × 365 days, no payment method required
    const trialEnd = Math.floor(Date.now() / 1000) + gift.years * 365 * 86400
    const subscription = await stripe.subscriptions.create({
      customer:  customer.id,
      items:     [{ price: priceId }],
      trial_end: trialEnd,
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: { plan: gift.plan, billing_cycle: 'yearly', user_id: userId, gift_code: code },
    })

    // Update profile
    await supabase.from('profiles').update({
      stripe_customer_id:    customer.id,
      stripe_subscription_id: subscription.id,
      subscription_status:   'trialing',
      plan:                   gift.plan,
      billing_cycle:          'yearly',
      trial_ends_at:          new Date(trialEnd * 1000).toISOString(),
    }).eq('id', userId)

    // (Code was already claimed atomically above.)

    // Send "vault is ready" email to recipient.
    // Language: the redeemer's own preference first, then the BUYER's, then
    // English. The redemption flow creates the account without ever asking for
    // a language, so profiles.language is often still null here, and a French
    // buyer's gift should not land in English.
    const lang = (await storedLanguage({ userId }))
      ?? await languageForUser(supabase, { email: gift.gifter_email })
    const t = translator(COPY, lang)
    const planName    = gift.plan === 'family' ? 'Everstead+' : 'Essential'
    const trialEndStr = emailDate(trialEnd * 1000, lang)
    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      email,
      subject: t('subjVaultReady'),
      html:    giftRedeemedHtml(name, planName, gift.gifter_name, trialEndStr, lang),
    }).catch(console.error)

    return res.status(200).json({ ok: true, plan: gift.plan, trialEnds: new Date(trialEnd * 1000).toISOString() })
  } catch (err) {
    // Stripe/profile step failed — release the claim so the gift isn't lost.
    await supabase.from('gift_codes')
      .update({ status: prevStatus, redeemed_at: null, redeemed_by: null })
      .eq('id', gift.id)
    console.error('gift redeem error:', err)
    captureException(err, { endpoint: 'gift/redeem' })
    return res.status(500).json({ error: err.message })
  }
}

/**
 * A recorded language preference, or null when there is none. languageForUser()
 * cannot stand in for this: it answers 'en' both for "prefers English" and for
 * "no row / no preference", which is exactly the distinction the gift fallback
 * chain needs. Never throws.
 */
async function storedLanguage({ userId, email } = {}) {
  try {
    if (!userId && !email) return null
    // No .catch() on a PostgREST builder: it is a thenable, not a promise.
    const q = supabase.from('profiles').select('language').limit(1)
    const { data } = userId
      ? await q.eq('id', userId).maybeSingle()
      : await q.ilike('email', email).maybeSingle()
    return data?.language ? pickLang(data.language) : null
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// EMAIL TEMPLATE
// ─────────────────────────────────────────────────────────────

// Plan names (Essential, Everstead+) and the support address stay as they are.
// No em/en dashes; French carries a real non-breaking space (U+00A0) before
// : ; ! ? and %.
const COPY = {
  en: {
    subjVaultReady: 'Your Everstead vault is ready 🎁',
    h1:             'Your vault is ready, {{name}}. 🎁',
    h1NoName:       'Your vault is ready, there. 🎁',
    line1Gifted:    "<strong>{{gifter}}</strong> gave you an Everstead <strong>{{plan}}</strong> plan, and it's now active. Your vault is set up and waiting for you.",
    line1Anon:      "You've received an Everstead <strong>{{plan}}</strong> plan, and it's now active. Your vault is set up and waiting for you.",
    line2:          "This is a gift, so there's no card required. You have access until <strong>{{date}}</strong>.",
    line3:          'Start by adding your first account or uploading an important document, it only takes a few minutes to build something genuinely useful.',
    cta:            'Go to my vault →',
    signOff:        ': The Everstead team',
    questions:      'Questions?',
  },
  fr: {
    subjVaultReady: 'Votre coffre Everstead est prêt 🎁',
    h1:             'Votre coffre est prêt, {{name}}. 🎁',
    h1NoName:       'Votre coffre est prêt. 🎁',
    line1Gifted:    '<strong>{{gifter}}</strong> vous a offert un forfait Everstead <strong>{{plan}}</strong>, et il est désormais actif. Votre coffre est prêt et vous attend.',
    line1Anon:      'Vous avez reçu un forfait Everstead <strong>{{plan}}</strong>, et il est désormais actif. Votre coffre est prêt et vous attend.',
    line2:          'C\'est un cadeau, aucune carte bancaire n\'est requise. Vous y avez accès jusqu\'au <strong>{{date}}</strong>.',
    line3:          'Commencez par ajouter votre premier compte ou par déposer un document important, quelques minutes suffisent pour construire quelque chose de vraiment utile.',
    cta:            'Accéder à mon coffre →',
    signOff:        ': L\'équipe Everstead',
    questions:      'Une question ?',
  },
}

// English keeps its "there" fallback in greetings; French drops the vocative
// rather than inventing one, so the greeting has a nameless twin.
const greet = (t, key, name) => (name ? t(key, { name }) : t(`${key}NoName`))

function giftRedeemedHtml(name, planName, gifterName, trialEndStr, lang) {
  const t = translator(COPY, lang)
  const first = name?.split(' ')[0]
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:28px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
            ${greet(t, 'h1', first)}
          </h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            ${gifterName ? t('line1Gifted', { gifter: gifterName, plan: planName }) : t('line1Anon', { plan: planName })}
          </p>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            ${t('line2', { date: trialEndStr })}
          </p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
            ${t('line3')}
          </p>
          <a href="${APP_URL}/dashboard" style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">${t('cta')}</a>
          <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">${t('signOff')}</p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            ${t('questions')} <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
