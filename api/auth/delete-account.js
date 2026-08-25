import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'
import { translator } from '../_lib/email-i18n.js'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId } = req.body
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!userId || !token) return res.status(400).json({ error: 'Missing fields' })

  // Verify the token belongs to the user being deleted
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user || user.id !== userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Fetch profile for email + Stripe IDs
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, language, stripe_subscription_id, stripe_customer_id, subscription_status')
    .eq('id', userId)
    .single()

  // ── Cancel Stripe subscription immediately ────────────────
  // Only if they have an active/trialing/cancelling subscription.
  // Deletion = immediate cancel (no grace period, unlike cancel_at_period_end).
  const activeStatuses = ['trialing', 'active', 'cancelling', 'past_due', 'incomplete']
  if (
    profile?.stripe_subscription_id &&
    activeStatuses.includes(profile.subscription_status)
  ) {
    try {
      await stripe.subscriptions.cancel(profile.stripe_subscription_id)
    } catch (err) {
      // Log but don't block deletion — the account should still be deleted
      console.error('delete-account: Stripe cancellation error:', err.message)
      captureException(err, { endpoint: 'auth/delete-account' })
    }
  }

  // ── Schedule deletion — data removed within 30 days ──────
  const deletionAt = new Date(Date.now() + 30 * 24 * 3600000).toISOString()
  const { error: dbError } = await supabase
    .from('profiles')
    .update({
      subscription_status:    'pending_deletion',
      scheduled_deletion_at:  deletionAt,
      // Clear Stripe IDs so no further billing actions are attempted
      stripe_subscription_id: null,
      cancel_at:              null,
    })
    .eq('id', userId)

  if (dbError) {
    console.error('delete-account DB error:', dbError)
    return res.status(500).json({ error: dbError.message })
  }

  // ── Send deletion confirmation email ──────────────────────
  if (profile?.email) {
    const t = translator(COPY, profile.language)
    resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      profile.email,
      subject: t('subject'),
      html:    deletionHtml(profile.full_name, profile.language),
    }).catch(console.error)
  }

  res.status(200).json({ scheduled: true })
}

// Customer-facing copy, per recipient language (profiles.language).
// French strings carry a real NBSP (U+00A0) before ? ! ; : and %, as French
// typography requires. Do not "tidy" those into ordinary spaces.
const COPY = {
  en: {
    subject:       'Your Everstead account has been deleted',
    h1Named:       'Account deleted, {{name}}.',
    h1Anon:        'Account deleted, there.',
    confirmed:     "We've confirmed the deletion of your Everstead account. Any active subscription has been cancelled immediately, you will not be charged again.",
    scheduled:     "Your account is scheduled for deletion within <strong>30 days</strong>. If this was a mistake, contact us within that window and we'll do our best to help.",
    exportHeading: 'Download a copy of your data before then.',
    exportBody:    "Everything you've added to your Everstead plan is yours to keep. Visit your dashboard to export a complete copy of your accounts, documents, instructions, and wishes while your account is still active.",
    exportCta:     'Export my data →',
    sorry:         "We're sorry to see you go. If you have a moment, we'd genuinely love to know what we could have done better, just reply to this email.",
    contactCta:    'Contact support',
    questions:     'Questions?',
  },
  fr: {
    subject:       'Votre compte Everstead a été supprimé',
    h1Named:       'Compte supprimé, {{name}}.',
    h1Anon:        'Votre compte Everstead est supprimé.',
    confirmed:     'Nous confirmons la suppression de votre compte Everstead. Tout abonnement actif a été résilié immédiatement, vous ne serez plus débité.',
    scheduled:     "Votre compte est programmé pour suppression sous <strong>30 jours</strong>. S'il s'agit d'une erreur, contactez-nous avant cette échéance et nous ferons notre possible pour vous aider.",
    exportHeading: 'Téléchargez une copie de vos données avant cette date.',
    exportBody:    'Tout ce que vous avez ajouté à votre plan Everstead vous appartient. Rendez-vous sur votre tableau de bord pour exporter une copie complète de vos comptes, documents, instructions et volontés tant que votre compte est encore actif.',
    exportCta:     'Exporter mes données →',
    sorry:         'Nous sommes navrés de vous voir partir. Si vous avez un instant, nous aimerions sincèrement savoir ce que nous aurions pu faire mieux, il vous suffit de répondre à cet e-mail.',
    contactCta:    "Contacter l'assistance",
    questions:     'Une question ?',
  },
}

function deletionHtml(name, lang) {
  const t         = translator(COPY, lang)
  // null (not 'there') so the un-named case can pick its own sentence: French
  // has no natural vocative filler, so it drops the name instead of inventing one.
  const firstName = name?.split(' ')[0] || null
  const appUrl    = process.env.VITE_APP_URL || 'https://www.everstead.care'

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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${firstName ? t('h1Named', { name: firstName }) : t('h1Anon')}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">
            ${t('confirmed')}
          </p>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">
            ${t('scheduled')}
          </p>
          <p style="margin:0 0 8px;color:#4a5568;font-size:16px;line-height:1.6;font-weight:600;">${t('exportHeading')}</p>
          <p style="margin:0 0 24px;color:#4a5568;font-size:16px;line-height:1.6;">
            ${t('exportBody')}
          </p>
          <a href="https://www.everstead.care/dashboard?tab=settings" style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;margin-bottom:24px;">${t('exportCta')}</a>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">
            ${t('sorry')}
          </p>
          <a href="mailto:support@everstead.care" style="display:inline-block;background:#f5f4f0;color:#0d1628;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;border:1px solid #e8e5e0;">${t('contactCta')}</a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">${t('questions')} <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
