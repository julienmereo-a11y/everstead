import { Resend } from 'resend'
import { requireAdmin, adminDb as db } from '../_lib/admin-auth.js'
import { withSentry, captureException } from '../lib/sentry.js'

// ─────────────────────────────────────────────────────────────────────────────
// Admin-only: broadcast an email to all users or a specific group.
//
// POST { mode, audience, emails?, subject, message, respectMarketingPrefs }
//   mode 'preview' → resolve the audience and return { count, sample } only.
//   mode 'test'    → send the composed email to the CALLING ADMIN only.
//   mode 'send'    → send to the resolved audience, then write an audit row
//                    to admin_broadcasts (service-role-only table).
//
// Audiences (resolved server-side from profiles — the client is never trusted
// with the recipient list, except 'emails' which is intersected with profiles
// so this can never be used to email arbitrary addresses):
//   all · free · essential · family · advisor · founding · trialing ·
//   payment_issue (trial_expired/past_due) · emails (explicit list)
//
// Every audience excludes suspended accounts and rows without an email, and is
// deduped case-insensitively. respectMarketingPrefs (default true) additionally
// drops anyone who unsubscribed from marketing (marketing_emails_enabled=false)
// — keep it on for anything promotional; turn it off only for genuine
// service/account notices, which UK PECR permits without marketing consent.
//
// {{name}} in subject/message is replaced with the recipient's first name.
// Sending uses Resend's batch API in chunks of 50; failures are counted and
// reported, never thrown mid-run (a bad address must not abort the broadcast).
// ─────────────────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Everstead <hello@everstead.care>'
const BATCH_SIZE = 50
const AUDIENCES = new Set(['all', 'free', 'essential', 'family', 'advisor', 'founding', 'trialing', 'payment_issue', 'emails'])

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))

const firstName = (fullName) => (fullName || '').trim().split(/\s+/)[0] || 'there'

const personalise = (text, name) => text.replaceAll('{{name}}', name)

// Turn bare URLs in already-escaped text into clickable links. Runs AFTER esc(),
// so any & in a query string is already &amp; — the correct encoding inside an
// href attribute. Trailing sentence punctuation is kept outside the link.
function linkify(escapedText) {
  return escapedText.replace(/https?:\/\/[^\s<]+/g, (url) => {
    const trail = (/[.,;:!?)\]]+$/.exec(url) || [''])[0]
    const clean = trail ? url.slice(0, -trail.length) : url
    return `<a href="${clean}" style="color:#4c7d47;text-decoration:underline;">${clean}</a>${trail}`
  })
}

// Escaped plain text → paragraphs (blank line), line breaks, clickable URLs.
function messageHtml(message) {
  return esc(message).trim()
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">${linkify(p).replace(/\n/g, '<br/>')}</p>`)
    .join('\n')
}

function emailHtml({ message, name }) {
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
          ${messageHtml(personalise(message, name))}
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0 0 6px;color:#9ca3af;font-size:13px;line-height:1.5;">You're receiving this because you have an Everstead account.</p>
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            <a href="${process.env.VITE_APP_URL || 'https://www.everstead.care'}/dashboard?tab=settings" style="color:#4c7d47;">Manage your email preferences</a>
            · <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

async function resolveAudience({ audience, emails, respectMarketingPrefs }) {
  let query = db.from('profiles')
    .select('id, email, full_name, plan, subscription_status, is_founding_member, marketing_emails_enabled, is_suspended')
    .not('email', 'is', null)

  if (['free', 'essential', 'family', 'advisor'].includes(audience)) query = query.eq('plan', audience)
  if (audience === 'founding')      query = query.eq('is_founding_member', true)
  if (audience === 'trialing')      query = query.eq('subscription_status', 'trialing')
  if (audience === 'payment_issue') query = query.in('subscription_status', ['trial_expired', 'past_due'])

  const { data, error } = await query.limit(10000)
  if (error) throw new Error(`Could not resolve audience: ${error.message}`)

  let rows = (data ?? []).filter(u => u.is_suspended !== true)
  if (respectMarketingPrefs) rows = rows.filter(u => u.marketing_emails_enabled !== false)

  if (audience === 'emails') {
    const wanted = new Set((emails ?? []).map(e => String(e).trim().toLowerCase()).filter(Boolean))
    if (wanted.size === 0) return []
    rows = rows.filter(u => wanted.has(u.email.toLowerCase()))
  }

  // Dedupe case-insensitively (family members can share inbox conventions).
  const seen = new Set()
  return rows.filter(u => {
    const key = u.email.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const {
    mode = 'preview',
    audience,
    emails,
    subject = '',
    message = '',
    respectMarketingPrefs = true,
  } = req.body ?? {}

  if (!AUDIENCES.has(audience)) return res.status(400).json({ error: 'Unknown audience' })
  if (mode !== 'preview' && (!subject.trim() || !message.trim())) {
    return res.status(400).json({ error: 'Subject and message are required' })
  }

  try {
    const recipients = await resolveAudience({ audience, emails, respectMarketingPrefs })

    if (mode === 'preview') {
      return res.status(200).json({
        count: recipients.length,
        sample: recipients.slice(0, 5).map(u => u.email),
      })
    }

    if (mode === 'test') {
      const name = firstName((await db.from('profiles').select('full_name').eq('id', admin.id).maybeSingle()).data?.full_name)
      const { error } = await resend.emails.send({
        from: FROM,
        to: admin.email,
        subject: `[TEST] ${personalise(subject, name)}`,
        html: emailHtml({ message, name }),
      })
      if (error) throw new Error(error.message || 'Test send failed')
      return res.status(200).json({ test: true, to: admin.email })
    }

    // mode === 'send'
    if (recipients.length === 0) return res.status(400).json({ error: 'No recipients match this audience' })

    let sent = 0
    let failed = 0
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const chunk = recipients.slice(i, i + BATCH_SIZE)
      try {
        const { data, error } = await resend.batch.send(chunk.map(u => {
          const name = firstName(u.full_name)
          return {
            from: FROM,
            to: u.email,
            subject: personalise(subject, name),
            html: emailHtml({ message, name }),
          }
        }))
        if (error) { failed += chunk.length; continue }
        sent += data?.data?.length ?? chunk.length
      } catch (err) {
        // One bad batch must not abort the broadcast — count it and continue.
        failed += chunk.length
        captureException(err, { endpoint: 'admin/broadcast-email', stage: 'batch', offset: i })
      }
    }

    await db.from('admin_broadcasts').insert({
      sent_by: admin.id,
      audience,
      subject,
      message,
      recipient_count: sent,
      failed_count: failed,
      respect_marketing_prefs: respectMarketingPrefs,
    })

    return res.status(200).json({ sent, failed, total: recipients.length })
  } catch (err) {
    console.error('broadcast-email error:', err)
    captureException(err, { endpoint: 'admin/broadcast-email' })
    return res.status(500).json({ error: err.message || 'Broadcast failed' })
  }
}

export default withSentry(handler)
