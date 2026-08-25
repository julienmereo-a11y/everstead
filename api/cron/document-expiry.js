import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'
import { translator, emailDate } from '../_lib/email-i18n.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend  = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

// Document expiry alerts.
//
// Fires daily (09:30 UTC via vercel.json cron).
// For each document expiring in 90, 60, or 30 days:
//   - Creates an alert row in the `alerts` table (deduped by resource_id)
//   - Sends a single daily digest email to the owner (if notify_document_expiry = true)
//
// Thresholds: warn at 90 days, 60 days, 30 days before expiry.

const THRESHOLDS_DAYS = [90, 60, 30]

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now           = new Date()
  const ninetyDaysOut = new Date(now.getTime() + 90 * 86_400_000).toISOString().split('T')[0]
  const today         = now.toISOString().split('T')[0]

  // Fetch documents expiring within 90 days that haven't expired yet
  const { data: expiringDocs, error: docsError } = await supabase
    .from('documents')
    .select('id, user_id, name, doc_type, expires_at')
    .not('expires_at', 'is', null)
    .gt('expires_at', today)
    .lte('expires_at', ninetyDaysOut)

  if (docsError) {
    console.error('document-expiry docs query error:', docsError)
    return res.status(500).json({ error: docsError.message })
  }

  if (!expiringDocs?.length) {
    return res.status(200).json({ alerts: 0, emails: 0 })
  }

  // Group by user, compute days remaining
  const byUser = {}
  for (const doc of expiringDocs) {
    const expiresDate = new Date(doc.expires_at)
    const daysLeft    = Math.round((expiresDate - now) / 86_400_000)
    // Only flag at threshold windows
    const atThreshold = THRESHOLDS_DAYS.some(t => daysLeft <= t && daysLeft > t - 7)
    if (!atThreshold) continue

    if (!byUser[doc.user_id]) byUser[doc.user_id] = []
    byUser[doc.user_id].push({ ...doc, daysLeft })
  }

  const userIds = Object.keys(byUser)
  if (!userIds.length) {
    return res.status(200).json({ alerts: 0, emails: 0 })
  }

  // Fetch profiles for affected users
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, language, notify_document_expiry')
    .in('id', userIds)
    .neq('role', 'delegate')

  if (!profiles?.length) {
    return res.status(200).json({ alerts: 0, emails: 0 })
  }

  let alertsCreated = 0
  let emailsSent    = 0
  const errors      = []

  for (const profile of profiles) {
    const docs = byUser[profile.id]
    if (!docs?.length) continue

    try {
      // QUIET NUDGES: one alert + one email per threshold (90/60/30), not one per
      // day. Severity encodes the threshold (info=90, warning=60, critical=30) —
      // an existing auto-generated alert for this document at the SAME severity
      // means we've already nudged for this window, so skip it entirely.
      const { data: existingAlerts } = await supabase
        .from('alerts')
        .select('id, resource_id, severity')
        .eq('user_id', profile.id)
        .eq('category', 'documents')
        .eq('auto_generated', true)
        .in('resource_id', docs.map(d => d.id))
      const existingByDoc = {}
      for (const a of existingAlerts || []) existingByDoc[a.resource_id] = a

      const newDocs = [] // only these go in the email digest
      for (const doc of docs) {
        const severity = doc.daysLeft <= 30 ? 'critical' : doc.daysLeft <= 60 ? 'warning' : 'info'
        const existing = existingByDoc[doc.id]
        if (existing?.severity === severity) continue // already nudged at this threshold

        // The alerts table stores the display text shown to this one user, so
        // it is written in THEIR language: a French member should not get a
        // French email and an English in-app alert about the same document.
        // severity/category/resource_type stay English: those are queried.
        const tAlert = translator(COPY, profile.language)
        const title  = tAlert('alertTitle',  { name: doc.name, days: doc.daysLeft })
        const detail = tAlert('alertDetail', {
          type: doc.doc_type,
          name: doc.name,
          date: emailDate(doc.expires_at, profile.language),
        })
        const row = {
          user_id:        profile.id,
          severity,
          title,
          detail,
          category:       'documents',
          is_read:        false,
          auto_generated: true,
          action_url:     `${APP_URL}/dashboard?tab=documents`,
          resource_type:  'document',
          resource_id:    doc.id,
          created_at:     now.toISOString(),
        }
        // Escalate the existing alert in place (new threshold) or create the first one.
        if (existing) {
          await supabase.from('alerts').update(row).eq('id', existing.id)
        } else {
          await supabase.from('alerts').insert(row)
        }
        newDocs.push(doc)
        alertsCreated++
      }

      // Send ONE email digest per new threshold crossing (if opted in)
      if (newDocs.length && profile.notify_document_expiry !== false && profile.email) {
        const docs      = newDocs
        // Recipient is the document owner, so their own profiles.language decides.
        const t         = translator(COPY, profile.language)
        const first     = profile.full_name?.split(' ')[0]
        const docRows   = docs.map(d => `
          <tr>
            <td style="padding:10px 14px;font-size:14px;color:#1a202c;">${d.name}</td>
            <td style="padding:10px 14px;font-size:14px;color:#4a5568;">${d.doc_type}</td>
            <td style="padding:10px 14px;font-size:14px;color:${d.daysLeft <= 30 ? '#c53030' : d.daysLeft <= 60 ? '#c05621' : '#2d6a4f'};">
              ${d.daysLeft === 1 ? t('dayOne', { n: d.daysLeft }) : t('dayMany', { n: d.daysLeft })}
            </td>
          </tr>`).join('')

        await resend.emails.send({
          from:    'Everstead <hello@everstead.care>',
          to:      profile.email,
          subject: docs.length === 1
            ? t('subjectOne', { name: docs[0].name, days: docs[0].daysLeft })
            : t('subjectMany', { count: docs.length }),
          html: `<!DOCTYPE html>
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
            ${first ? t('h1', { name: first }) : t('h1Anon')}
          </h1>
          <p style="margin:0 0 20px;color:#4a5568;font-size:16px;line-height:1.7;">
            ${docs.length === 1 ? t('introOne') : t('introMany')}
          </p>
          <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 28px;">
            <thead>
              <tr style="background:#f9f8f6;">
                <th style="padding:10px 14px;text-align:left;font-size:12px;color:#718096;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${t('thDocument')}</th>
                <th style="padding:10px 14px;text-align:left;font-size:12px;color:#718096;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${t('thType')}</th>
                <th style="padding:10px 14px;text-align:left;font-size:12px;color:#718096;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${t('thExpires')}</th>
              </tr>
            </thead>
            <tbody>${docRows}</tbody>
          </table>
          <a href="${APP_URL}/dashboard?tab=documents"
             style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">
            ${t('cta')}
          </a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            ${t('footer')}
            <a href="${APP_URL}/dashboard?tab=settings" style="color:#9ca3af;">${t('managePreferences')}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        })
        emailsSent++
      }
    } catch (err) {
      console.error(`document-expiry error for ${profile.email}:`, err)
      captureException(err, { endpoint: 'cron/document-expiry' })
      errors.push(`${profile.id}: ${err.message}`)
    }
  }

  console.log('document-expiry:', { alertsCreated, emailsSent, errors })
  return res.status(200).json({ alerts: alertsCreated, emails: emailsSent, total: expiringDocs.length, errors })
}

// ── Email copy ────────────────────────────────────────────────
// Customer-facing strings for the expiry digest, per language. Document names
// and doc_type values are stored data and stay exactly as the owner saved them.
// The nameless h1 keeps the English wording that shipped before ("there, …").
const COPY = {
  en: {
    subjectOne:        'Action needed: {{name}} expires in {{days}} days',
    subjectMany:       '{{count}} documents in your Everstead vault are expiring soon',
    h1:                '{{name}}, a document in your vault is expiring soon.',
    h1Anon:            'there, a document in your vault is expiring soon.',
    introOne:          'Please review and renew the following document to keep your estate plan up to date:',
    introMany:         'Please review and renew the following documents to keep your estate plan up to date:',
    thDocument:        'Document',
    thType:            'Type',
    thExpires:         'Expires in',
    dayOne:            '{{n}} day',
    dayMany:           '{{n}} days',
    cta:               'View my documents →',
    footer:            "You're receiving this because document expiry alerts are enabled on your Everstead account.",
    managePreferences: 'Manage preferences',
    alertTitle:        '{{name}} expires in {{days}} days',
    alertDetail:       'Your {{type}} document "{{name}}" is due to expire on {{date}}. Please renew or update it.',
  },
  fr: {
    subjectOne:        'Action requise : {{name}} expire dans {{days}} jours',
    subjectMany:       '{{count}} documents de votre coffre Everstead arrivent à expiration',
    h1:                '{{name}}, un document de votre coffre arrive à expiration.',
    h1Anon:            'Un document de votre coffre arrive à expiration.',
    introOne:          'Merci de vérifier et de renouveler le document suivant pour garder votre plan de succession à jour :',
    introMany:         'Merci de vérifier et de renouveler les documents suivants pour garder votre plan de succession à jour :',
    thDocument:        'Document',
    thType:            'Type',
    thExpires:         'Expire dans',
    dayOne:            '{{n}} jour',
    dayMany:           '{{n}} jours',
    cta:               'Voir mes documents →',
    footer:            'Vous recevez cet e-mail parce que les alertes d\'expiration de documents sont activées sur votre compte Everstead.',
    managePreferences: 'Gérer mes préférences',
    alertTitle:        '{{name}} expire dans {{days}} jours',
    alertDetail:       'Votre document {{type}} « {{name}} » arrive à expiration le {{date}}. Merci de le renouveler ou de le mettre à jour.',
  },
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
