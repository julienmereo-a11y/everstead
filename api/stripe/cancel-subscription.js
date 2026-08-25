import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'
import { translator, emailDate } from '../_lib/email-i18n.js'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── Authenticate the caller ───────────────────────────────────
  // This endpoint can ban accounts, extend trials, and cancel subscriptions —
  // never trust the userId/subscriptionId in the body without proving who's asking.
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !authUser) return res.status(401).json({ error: 'Unauthorized' })

  const { subscriptionId, userId, action, days } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  // Look up the CALLER's own profile to determine privileges + ownership.
  const { data: caller } = await supabase
    .from('profiles')
    .select('role, stripe_subscription_id')
    .eq('id', authUser.id)
    .single()
  const isAdmin = caller?.role === 'admin'

  // ── Authorize by action ───────────────────────────────────────
  // Admin-only: suspend/unsuspend any account, extend any trial.
  const ADMIN_ONLY = ['suspend-user', 'unsuspend-user', 'extend-trial']
  if (ADMIN_ONLY.includes(action)) {
    if (!isAdmin) return res.status(403).json({ error: 'Forbidden' })
  } else {
    // Self-service (cancel / reactivate): a non-admin may only act on their OWN
    // subscription. Admins may act on anyone's.
    if (!isAdmin) {
      if (authUser.id !== userId) return res.status(403).json({ error: 'Forbidden' })
      if (!subscriptionId || caller?.stripe_subscription_id !== subscriptionId) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }
  }

  // ── Suspend user (admin only) ─────────────────────────────────
  if (action === 'suspend-user') {
    try {
      await supabase.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
      await supabase.from('profiles').update({ is_suspended: true }).eq('id', userId)
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('suspend-user error:', err)
      captureException(err, { endpoint: 'stripe/cancel-subscription', action: 'suspend-user' })
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
      captureException(err, { endpoint: 'stripe/cancel-subscription', action: 'unsuspend-user' })
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

      // Email the user. Admin triggers it, but the USER receives it, so it is
      // written in the user's language.
      const { data: profile } = await supabase.from('profiles').select('full_name, email, language').eq('id', userId).single()
      if (profile?.email) {
        const endDate = emailDate(finalTrialEnd * 1000, profile.language)
        const t = translator(COPY, profile.language)
        await resend.emails.send({
          from:    'Everstead <hello@everstead.care>',
          to:      profile.email,
          subject: t('subjTrialExtended'),
          html:    trialExtendedHtml(profile.full_name, extendDays, endDate, profile.language),
        }).catch(console.error)
      }

      return res.status(200).json({ success: true, trialEndsAt })
    } catch (err) {
      console.error('extend-trial error:', err)
      captureException(err, { endpoint: 'stripe/cancel-subscription', action: 'extend-trial' })
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
      captureException(err, { endpoint: 'stripe/cancel-subscription', action: 'reactivate' })
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
      .select('full_name, email, language')
      .eq('id', userId)
      .single()

    if (profiles?.email) {
      const t = translator(COPY, profiles.language)
      const firstName = profiles.full_name?.split(' ')[0]
      // The JSON response above keeps its en-GB dates (unchanged API contract);
      // the email gets the same instant formatted in the recipient's language.
      const emailAccessEnd = cancelAt
        ? emailDate(cancelAt, profiles.language)
        : (periodEnd ? emailDate(periodEnd * 1000, profiles.language) : null)
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      profiles.email,
        subject: greet(t, 'subjCancelled', firstName),
        html:    cancellationHtml(firstName, emailAccessEnd, profiles.language),
      }).catch(console.error)
    }

    res.status(200).json({ success: true, cancelAt, cancelAtDate: cancelAtDate ?? periodEndDate, periodEnd, periodEndDate })
  } catch (err) {
    console.error('cancel-subscription error:', err)
    captureException(err, { endpoint: 'stripe/cancel-subscription', action: 'cancel' })
    res.status(500).json({ error: err.message })
  }
}

// ─────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────

// Both emails in this file go to the SUBSCRIBER (the trial extension is
// triggered by an admin but lands in the user's inbox), so both follow
// profiles.language. No em/en dashes; French uses a real non-breaking space
// (U+00A0) before : ; ! ? and %.
const COPY = {
  en: {
    subjCancelled:       "We're sorry to see you go, {{name}}.",
    subjCancelledNoName: "We're sorry to see you go, there.",
    subjTrialExtended:   'Good news, your Everstead trial has been extended',
    questions:           'Questions?',

    // Cancellation confirmation
    cxH1:                "We're sorry to see you go, {{name}}.",
    cxH1NoName:          "We're sorry to see you go, there.",
    cxLine1Dated:        "We've confirmed the cancellation of your Everstead plan. You'll keep full access until <strong>{{date}}</strong>, nothing changes until then.",
    cxLine1Plain:        "We've confirmed the cancellation of your Everstead plan. You'll keep full access until the end of your current billing period.",
    cxLine2:             "We built Everstead because we believe every family deserves clarity, not chaos. We're sorry we didn't get the chance to be part of yours.",
    cxLine3:             "If you have a moment, we'd genuinely love to hear from you. What could we have done better? Was there something missing? Your feedback (even just a sentence) would mean a lot to us and help us build something better for the next family.",
    cxLine4:             "If you ever change your mind, your account will be here. We'll keep your data safe for 30 days.",
    cxExportTitle:       "Before you go, don't forget to export your data.",
    cxExportBody:        "Everything you've added to your Everstead plan is yours to keep. You can download a complete copy of your accounts, documents, instructions, and wishes from your dashboard before your access ends.",
    cxExportCta:         'Export my data →',
    cxSignOff:           'With thanks for giving us a try.<br>The Everstead team',
    cxFooterLead:        'Reply to this email or write to',
    cxFooterTail:        ' with any feedback.',

    // Trial extended (admin action)
    teH1:                'Good news, {{name}}',
    teH1NoName:          'Good news, there',
    teLine1:             "We've extended your Everstead free trial by <strong>{{days}} days</strong>. Your trial now runs until <strong>{{date}}</strong>, no action needed on your end.",
    teLine2:             'Use the extra time to get your estate plan in order. If you have any questions or need help getting started, just reply to this email.',
    teCta:               'Go to your dashboard →',
  },
  fr: {
    subjCancelled:       'Nous sommes désolés de vous voir partir, {{name}}.',
    subjCancelledNoName: 'Nous sommes désolés de vous voir partir.',
    subjTrialExtended:   'Bonne nouvelle, votre essai Everstead a été prolongé',
    questions:           'Une question ?',

    cxH1:                'Nous sommes désolés de vous voir partir, {{name}}.',
    cxH1NoName:          'Nous sommes désolés de vous voir partir.',
    cxLine1Dated:        'Nous avons bien enregistré la résiliation de votre forfait Everstead. Vous conservez un accès complet jusqu\'au <strong>{{date}}</strong>, rien ne change d\'ici là.',
    cxLine1Plain:        'Nous avons bien enregistré la résiliation de votre forfait Everstead. Vous conservez un accès complet jusqu\'à la fin de votre période de facturation en cours.',
    cxLine2:             'Nous avons créé Everstead parce que nous pensons que chaque famille mérite de la clarté, pas du chaos. Nous regrettons de ne pas avoir eu la chance de faire partie de la vôtre.',
    cxLine3:             'Si vous avez un instant, nous aimerions beaucoup avoir votre avis. Qu\'aurions-nous pu faire mieux ? Qu\'est-ce qui vous a manqué ? Votre retour, même en une phrase, compterait beaucoup pour nous et nous aiderait à faire mieux pour la prochaine famille.',
    cxLine4:             'Si vous changez d\'avis, votre compte vous attend. Nous conserverons vos données en sécurité pendant 30 jours.',
    cxExportTitle:       'Avant de partir, pensez à exporter vos données.',
    cxExportBody:        'Tout ce que vous avez ajouté à votre plan Everstead vous appartient. Vous pouvez télécharger une copie complète de vos comptes, documents, instructions et volontés depuis votre tableau de bord avant la fin de votre accès.',
    cxExportCta:         'Exporter mes données →',
    cxSignOff:           'Merci d\'avoir essayé Everstead.<br>L\'équipe Everstead',
    cxFooterLead:        'Répondez à cet e-mail ou écrivez à',
    cxFooterTail:        ' pour nous faire part de vos retours.',

    teH1:                'Bonne nouvelle, {{name}}',
    teH1NoName:          'Bonne nouvelle',
    teLine1:             'Nous avons prolongé votre essai gratuit Everstead de <strong>{{days}} jours</strong>. Votre essai court désormais jusqu\'au <strong>{{date}}</strong>, vous n\'avez rien à faire.',
    teLine2:             'Profitez de ce temps supplémentaire pour mettre votre plan en ordre. Si vous avez des questions ou besoin d\'aide pour démarrer, répondez simplement à cet e-mail.',
    teCta:               'Accéder à votre tableau de bord →',
  },
}

// English keeps its "there" fallback in greetings; French drops the vocative
// rather than inventing one, so every greeting key has a nameless twin.
const greet = (t, key, name) => (name ? t(key, { name }) : t(`${key}NoName`))

function cancellationHtml(firstName, accessEndDate, lang) {
  const t = translator(COPY, lang)
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
          <h1 style="margin:0 0 20px;color:#0d1628;font-size:24px;font-weight:normal;">${greet(t, 'cxH1', firstName)}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            ${accessEndDate ? t('cxLine1Dated', { date: accessEndDate }) : t('cxLine1Plain')}
          </p>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            ${t('cxLine2')}
          </p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
            ${t('cxLine3')}
          </p>
          <p style="margin:0 0 20px;color:#4a5568;font-size:16px;line-height:1.7;">
            ${t('cxLine4')}
          </p>
          <p style="margin:0 0 8px;color:#4a5568;font-size:15px;line-height:1.7;font-weight:600;">${t('cxExportTitle')}</p>
          <p style="margin:0 0 24px;color:#4a5568;font-size:15px;line-height:1.7;">
            ${t('cxExportBody')}
          </p>
          <a href="https://www.everstead.care/dashboard?tab=settings" style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-size:14px;margin-bottom:24px;">${t('cxExportCta')}</a>
          <p style="margin:0 0 0;color:#6b7280;font-size:15px;line-height:1.6;font-style:italic;">${t('cxSignOff')}</p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">${t('cxFooterLead')} <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a>${t('cxFooterTail')}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function trialExtendedHtml(name, days, endDate, lang) {
  const t = translator(COPY, lang)
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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${greet(t, 'teH1', name)}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            ${t('teLine1', { days, date: endDate })}
          </p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
            ${t('teLine2')}
          </p>
          <a href="${process.env.VITE_APP_URL}/dashboard" style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">${t('teCta')}</a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">${t('questions')} <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
