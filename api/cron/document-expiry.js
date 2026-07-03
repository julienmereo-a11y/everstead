import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry } from '../lib/sentry.js'

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
    .select('id, full_name, email, notify_document_expiry')
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

        const title  = `${doc.name} expires in ${doc.daysLeft} days`
        const detail = `Your ${doc.doc_type} document "${doc.name}" is due to expire on ${new Date(doc.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Please renew or update it.`
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
        const first     = profile.full_name?.split(' ')[0] || 'there'
        const docRows   = docs.map(d => `
          <tr>
            <td style="padding:10px 14px;font-size:14px;color:#1a202c;">${d.name}</td>
            <td style="padding:10px 14px;font-size:14px;color:#4a5568;">${d.doc_type}</td>
            <td style="padding:10px 14px;font-size:14px;color:${d.daysLeft <= 30 ? '#c53030' : d.daysLeft <= 60 ? '#c05621' : '#2d6a4f'};">
              ${d.daysLeft} day${d.daysLeft === 1 ? '' : 's'}
            </td>
          </tr>`).join('')

        await resend.emails.send({
          from:    'Everstead <hello@everstead.care>',
          to:      profile.email,
          subject: docs.length === 1
            ? `Action needed: ${docs[0].name} expires in ${docs[0].daysLeft} days`
            : `${docs.length} documents in your Everstead vault are expiring soon`,
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
            ${first}, a document in your vault is expiring soon.
          </h1>
          <p style="margin:0 0 20px;color:#4a5568;font-size:16px;line-height:1.7;">
            Please review and renew the following ${docs.length === 1 ? 'document' : 'documents'} to keep your estate plan up to date:
          </p>
          <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 28px;">
            <thead>
              <tr style="background:#f9f8f6;">
                <th style="padding:10px 14px;text-align:left;font-size:12px;color:#718096;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Document</th>
                <th style="padding:10px 14px;text-align:left;font-size:12px;color:#718096;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Type</th>
                <th style="padding:10px 14px;text-align:left;font-size:12px;color:#718096;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Expires in</th>
              </tr>
            </thead>
            <tbody>${docRows}</tbody>
          </table>
          <a href="${APP_URL}/dashboard?tab=documents"
             style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">
            View my documents →
          </a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            You're receiving this because document expiry alerts are enabled on your Everstead account.
            <a href="${APP_URL}/dashboard?tab=settings" style="color:#9ca3af;">Manage preferences</a>
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
      errors.push(`${profile.id}: ${err.message}`)
    }
  }

  console.log('document-expiry:', { alertsCreated, emailsSent, errors })
  return res.status(200).json({ alerts: alertsCreated, emails: emailsSent, total: expiringDocs.length, errors })
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
