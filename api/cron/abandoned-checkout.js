import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry } from '../lib/sentry.js'
import { translator, pickLang } from '../_lib/email-i18n.js'
import { planLabel } from '../_lib/plan-label.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend  = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

// Plan display config — mirrors PLAN_OPTIONS in GetStarted.jsx.
// Labels are brand names and never translated; the price line and the feature
// bullets live in COPY below because they are prose, not data.
const PLAN_META = {
  essential: {
    label:        planLabel('essential'),
    priceKey:     'priceEssential',
    featureKeys:  ['essentialFeature1', 'essentialFeature2', 'essentialFeature3'],
  },
  family: {
    label:        planLabel('family'),
    priceKey:     'priceFamily',
    featureKeys:  ['familyFeature1', 'familyFeature2', 'familyFeature3', 'familyFeature4'],
  },
  advisor: {
    label:        planLabel('advisor'),
    priceKey:     'priceAdvisor',
    featureKeys:  ['advisorFeature1', 'advisorFeature2', 'advisorFeature3', 'advisorFeature4'],
  },
}

async function handler(req, res) {
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
    .select('id, full_name, email, plan, language, billing_cycle, checkout_started_at')
    .not('stripe_customer_id', 'is', null)       // reached payment step
    .is('stripe_subscription_id', null)           // never completed checkout
    .is('abandoned_checkout_email_sent_at', null) // not already emailed
    .not('email', 'is', null)                     // has an email address
    .neq('role', 'delegate')                      // not a delegate user
    .neq('marketing_emails_enabled', false)       // respect unsubscribe
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
      // Recipient is the account holder, so their own profiles.language decides.
      const t     = translator(COPY, user.language)
      const first = user.full_name?.split(' ')[0]

      await resend.emails.send({
        from:    'Julien at Everstead <hello@everstead.care>',
        to:      user.email,
        subject: first ? t('subject', { name: first }) : t('subjectAnon'),
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
// EMAIL COPY
// Prices stay in pounds in both languages: Stripe still charges in GBP, and the
// French site says so too (see src/i18n/locales/fr/pricing.json "gbpNote").
// Only the number format follows the language. The registered company line is a
// legal identity and is never translated.
// ─────────────────────────────────────────────────────────────
const COPY = {
  en: {
    subject:           '{{name}} Everstead trial is ready, one step left',
    subjectAnon:       'Your Everstead trial is ready, one step left',
    title:             'Your Everstead trial is waiting',
    tagline:           'Estate planning, done thoughtfully',
    h1:                '{{name}}, your free trial is still here.',
    h1Anon:            'there, your free trial is still here.',
    intro:             "You chose the <strong>{{plan}}</strong> plan and created your account, but didn't quite finish. Your 14-day free trial is still reserved for you.",
    reassure:          "All you need to do is add your card. You won't be charged for 14&nbsp;days, and you can cancel any time before then.",
    planHeading:       '{{plan}} plan',
    trialIncluded:     '14-day free trial included',
    cta:               'Complete my free trial →',
    quick:             'It takes about 30 seconds, your account and details are already saved.',
    signoff:           'Julien, founder of Everstead',
    trust:             '🔒 AES-256 encryption &nbsp;·&nbsp; No charge for 14 days &nbsp;·&nbsp; Cancel any time',
    footerQuestions:   'Questions? Reply to this email or write to',
    unsubscribe:       'Unsubscribe from these emails',
    priceEssential:    '£3.19/month (billed annually) or £3.99/month',
    priceFamily:       '£7.99/month (billed annually) or £9.99/month',
    priceAdvisor:      '£48/month (billed annually) or £60/month',
    essentialFeature1: 'Up to 10 accounts & documents',
    essentialFeature2: '1 trusted contact',
    essentialFeature3: '1 GB storage',
    familyFeature1:    'Two private vaults, one subscription',
    familyFeature2:    'Share only what you choose',
    familyFeature3:    '10 trusted contacts',
    familyFeature4:    '25 GB storage',
    advisorFeature1:   'Multi-client workspace',
    advisorFeature2:   'Co-branded portal',
    advisorFeature3:   'Client dashboards',
    advisorFeature4:   '100 GB storage',
  },
  fr: {
    subject:           'Votre essai Everstead est prêt, {{name}}, il ne manque qu\'une étape',
    subjectAnon:       'Votre essai Everstead est prêt, il ne manque qu\'une étape',
    title:             'Votre essai Everstead vous attend',
    tagline:           'La succession, préparée avec soin',
    h1:                '{{name}}, votre essai gratuit vous attend toujours.',
    h1Anon:            'Votre essai gratuit vous attend toujours.',
    intro:             'Vous avez choisi le forfait <strong>{{plan}}</strong> et créé votre compte, sans tout à fait aller au bout. Votre essai gratuit de 14 jours vous est toujours réservé.',
    reassure:          'Il vous suffit d\'ajouter votre carte. Aucun prélèvement pendant 14&nbsp;jours, et vous pouvez annuler à tout moment avant la fin.',
    planHeading:       'Forfait {{plan}}',
    trialIncluded:     '14 jours d\'essai gratuit inclus',
    cta:               'Terminer mon essai gratuit →',
    quick:             'Cela prend environ 30 secondes, votre compte et vos informations sont déjà enregistrés.',
    signoff:           'Julien, fondateur d\'Everstead',
    trust:             '🔒 Chiffrement AES-256 &nbsp;·&nbsp; Aucun prélèvement pendant 14 jours &nbsp;·&nbsp; Annulation à tout moment',
    footerQuestions:   'Une question ? Répondez à cet e-mail ou écrivez à',
    unsubscribe:       'Me désabonner de ces e-mails',
    priceEssential:    '3,19 £/mois en facturation annuelle ou 3,99 £/mois',
    priceFamily:       '7,99 £/mois en facturation annuelle ou 9,99 £/mois',
    priceAdvisor:      '48 £/mois en facturation annuelle ou 60 £/mois',
    essentialFeature1: 'Jusqu\'à 10 comptes et documents',
    essentialFeature2: '1 personne de confiance',
    essentialFeature3: '1 Go de stockage',
    familyFeature1:    'Deux coffres privés, un seul abonnement',
    familyFeature2:    'Vous ne partagez que ce que vous choisissez',
    familyFeature3:    '10 personnes de confiance',
    familyFeature4:    '25 Go de stockage',
    advisorFeature1:   'Espace multiclient',
    advisorFeature2:   'Portail à votre marque',
    advisorFeature3:   'Tableaux de bord clients',
    advisorFeature4:   '100 Go de stockage',
  },
}

// ─────────────────────────────────────────────────────────────
// EMAIL TEMPLATE
// ─────────────────────────────────────────────────────────────
function buildEmail(user) {
  const lang       = pickLang(user.language)
  const t          = translator(COPY, lang)
  const firstName  = user.full_name?.split(' ')[0]
  const unsubToken = Buffer.from(user.id).toString('base64url')
  const unsubUrl   = `${APP_URL}/api/email/unsubscribe?token=${unsubToken}`
  const plan      = PLAN_META[user.plan] ?? PLAN_META.essential
  const resumeUrl = `${APP_URL}/get-started?resume=true`

  const featureRows = plan.featureKeys
    .map(key => `
      <tr>
        <td style="padding:5px 0;color:#4a5568;font-size:15px;line-height:1.6;">
          <span style="color:#4c7d47;margin-right:10px;">✓</span>${t(key)}
        </td>
      </tr>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${t('title')}</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f4f0;padding:48px 0;">
    <tr><td align="center" style="padding:0 16px;">

      <table width="560" cellpadding="0" cellspacing="0" role="presentation"
             style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:560px;width:100%;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr>
          <td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:32px 40px;text-align:center;">
            <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="150" style="display:block;margin:0 auto;height:auto;max-width:150px;" />
            <p style="margin:6px 0 0;color:#94a3b8;font-size:12px;font-weight:normal;letter-spacing:0.1em;text-transform:uppercase;">${t('tagline')}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:44px 40px 36px;">

            <h1 style="margin:0 0 20px;color:#0d1628;font-family:Georgia,serif;font-size:26px;font-weight:normal;line-height:1.35;">
              ${firstName ? t('h1', { name: firstName }) : t('h1Anon')}
            </h1>

            <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
              ${t('intro', { plan: plan.label })}
            </p>

            <p style="margin:0 0 28px;color:#4a5568;font-size:16px;line-height:1.7;">
              ${t('reassure')}
            </p>

            <!-- Plan summary box -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                   style="background:#f8f7f5;border:1px solid #e8e5e0;border-radius:10px;margin-bottom:32px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;color:#0d1628;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;">${t('planHeading', { plan: plan.label })}</p>
                  <p style="margin:0 0 14px;color:#9ca3af;font-size:13px;">${t(plan.priceKey)} · ${t('trialIncluded')}</p>
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    ${featureRows}
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
              <tr>
                <td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);border-radius:9999px;">
                  <a href="${resumeUrl}"
                     style="display:inline-block;padding:15px 32px;color:#ffffff;font-family:Georgia,serif;font-size:16px;font-weight:normal;text-decoration:none;border-radius:8px;letter-spacing:0.01em;">
                    ${t('cta')}
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;color:#6b7280;font-size:15px;line-height:1.6;">
              ${t('quick')}
            </p>

            <p style="margin:28px 0 0;color:#6b7280;font-size:15px;line-height:1.6;">
${t('signoff')}
            </p>

          </td>
        </tr>

        <!-- Trust strip -->
        <tr>
          <td style="background:#f8f7f5;padding:20px 40px;border-top:1px solid #e8e5e0;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="color:#9ca3af;font-size:13px;text-align:center;">
                  ${t('trust')}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #e8e5e0;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;text-align:center;">
              ${t('footerQuestions')}
              <a href="mailto:hello@everstead.care" style="color:#4c7d47;text-decoration:none;">hello@everstead.care</a>
              <br>
              EVERSTEAD DIGITAL LTD · London, England, United Kingdom
              <br><br>
              <a href="${unsubUrl}"
                 style="color:#9ca3af;text-decoration:underline;">${t('unsubscribe')}</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
