import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'
import { translator, languageForUser } from '../_lib/email-i18n.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

const APP_URL = process.env.APP_URL || 'https://www.everstead.care'

// Admin-triggered: send a subprocessor change notification to all active
// subscribers. Auth via CRON_SECRET so only you (or a scheduled job) can fire it.
//
// POST /api/subprocessors/notify
//   Authorization: Bearer <CRON_SECRET>
//   Body: {
//     "subject": "Notice of new subprocessor — AcmeAI",
//     "summary": "Effective 1 July 2026, we will engage AcmeAI for...",
//     "effectiveDate": "1 July 2026",      // optional
//     "changes": [                          // optional list of bullets
//       "Adding AcmeAI Inc. for document OCR",
//       "Replacing X with Y for email delivery"
//     ]
//   }

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  const { subject, summary, effectiveDate, changes } = req.body || {}
  if (!subject || !summary) {
    return res.status(400).json({ error: 'Missing subject or summary' })
  }

  // Pull all active subscribers
  const { data: subs, error: subsErr } = await supabase
    .from('subprocessor_notification_subscribers')
    .select('email, unsubscribe_token')
    .is('unsubscribed_at', null)

  if (subsErr) {
    console.error('[notify] subscribers query error:', subsErr)
    return res.status(500).json({ error: 'Could not fetch subscribers' })
  }

  if (!subs || subs.length === 0) {
    return res.status(200).json({ sent: 0, message: 'No active subscribers' })
  }

  const sent = []
  const failed = []

  // Send sequentially to keep things simple and respect Resend rate limits.
  // Resend free tier: 100/day, 10/sec. Bump to Promise.allSettled with throttling if needed.
  for (const sub of subs) {
    const unsubLink = `${APP_URL}/api/subprocessors/unsubscribe?token=${sub.unsubscribe_token}`
    // Per-recipient language for the template chrome. The subject, summary and
    // change bullets are supplied by the admin firing this notice, so they go
    // out exactly as written, in whatever language they were written in.
    const lang = await languageForUser(supabase, { email: sub.email })
    try {
      await resend.emails.send({
        from: 'Everstead <hello@everstead.care>',
        to: sub.email,
        subject,
        html: notificationHtml({ summary, effectiveDate, changes, unsubLink, lang }),
      })
      sent.push(sub.email)
    } catch (err) {
      console.error(`[notify] send failed for ${sub.email}:`, err)
      captureException(err, { endpoint: 'subprocessors/notify' })
      failed.push({ email: sub.email, error: err.message })
    }
  }

  return res.status(200).json({ sent: sent.length, failed: failed.length, failedDetails: failed })
}

// Localised chrome for the notice, per recipient language (profiles.language).
// This is a legal notice under UK GDPR Art. 28, so the French follows official
// RGPD vocabulary ("sous-traitants ultérieurs"). "Everstead Pro" is a plan name
// and stays untranslated. French strings carry a real NBSP (U+00A0) before
// ? ! ; : as French typography requires.
const COPY = {
  en: {
    eyebrow:        'Subprocessor update',
    effectiveLabel: 'Effective:',
    fullList:       'The full list of current subprocessors (purpose, data location, and transfer safeguards) is at',
    objection:      "<strong>If you're an Everstead Pro customer and you object to this change</strong>, reply to this email or contact privacy@everstead.care within 30 days of this notice. If we can't resolve the objection, you may terminate your subscription without penalty.",
    footerNote:     "You're receiving this because you subscribed to Everstead subprocessor updates.",
    unsubscribe:    'Unsubscribe',
  },
  fr: {
    eyebrow:        'Avis sur les sous-traitants',
    effectiveLabel: 'En vigueur :',
    fullList:       'La liste complète des sous-traitants ultérieurs actuels (finalité, localisation des données et garanties de transfert) est consultable sur',
    objection:      "<strong>Si vous êtes client Everstead Pro et que vous vous opposez à cette modification</strong>, répondez à cet e-mail ou écrivez à privacy@everstead.care dans les 30 jours suivant le présent avis. Si nous ne parvenons pas à résoudre votre objection, vous pouvez résilier votre abonnement sans pénalité.",
    footerNote:     'Vous recevez cet e-mail parce que vous vous êtes abonné aux avis Everstead relatifs aux sous-traitants.',
    unsubscribe:    'Se désabonner',
  },
}

function notificationHtml({ summary, effectiveDate, changes, unsubLink, lang }) {
  const t = translator(COPY, lang)
  const changeList = Array.isArray(changes) && changes.length > 0
    ? `<ul style="margin:16px 0 16px 20px;padding:0;color:#374151;font-size:14px;line-height:1.7;">${
        changes.map(c => `<li>${escapeHtml(c)}</li>`).join('')
      }</ul>`
    : ''
  const effective = effectiveDate
    ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;"><strong>${t('effectiveLabel')}</strong> ${escapeHtml(effectiveDate)}</p>`
    : ''

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px;background:#f9fafb;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f2937;">
  <table style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:24px;">
      <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="140" style="display:block;height:auto;" /><p style="margin:10px 0 0;color:#ffffff;font-size:13px;opacity:.8;letter-spacing:.04em;">${t('eyebrow')}</p>
    </td></tr>
    <tr><td style="padding:28px 24px;">
      ${effective}
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(summary)}</p>
      ${changeList}
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#4b5563;">
        ${t('fullList')}
        <a href="${APP_URL}/subprocessors" style="color:#4c7d47;">everstead.care/subprocessors</a>.
      </p>
      <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#4b5563;">
        ${t('objection')}
      </p>
    </td></tr>
    <tr><td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        ${t('footerNote')}
        <a href="${unsubLink}" style="color:#6b7280;">${t('unsubscribe')}</a>.
      </p>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
