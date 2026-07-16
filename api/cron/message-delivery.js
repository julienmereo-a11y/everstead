import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'
import { withSentry, captureException } from '../lib/sentry.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend  = new Resend(process.env.RESEND_API_KEY)
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://www.everstead.care'

// Hourly: release Personal Messages scheduled for a specific date
// (messages.release_timing = 'on_date', release_at <= now). Mirrors what a
// manual "Release now" does — marks the message released, and for external
// email recipients mints the same one-time /m/<token> view link and emails it
// (copy identical to api/messages/release-link.js). Messages with
// release_timing = 'after_death' are NOT touched here: they release on
// verified passing, or when the owner releases them manually.
async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: due, error } = await supabase
    .from('messages')
    .select('id, user_id, title, recipient_name, recipient_email, view_token')
    .eq('released', false)
    .eq('release_timing', 'on_date')
    .lte('release_at', new Date().toISOString())
    .limit(200)

  if (error) {
    captureException(error, { endpoint: 'cron/message-delivery', stage: 'query' })
    return res.status(500).json({ error: error.message })
  }
  if (!due?.length) return res.status(200).json({ released: 0 })

  // Sender display names, one lookup per owner.
  const ownerIds = [...new Set(due.map(m => m.user_id))]
  const { data: owners } = await supabase
    .from('profiles').select('id, full_name').in('id', ownerIds)
  const nameOf = Object.fromEntries((owners || []).map(p => [p.id, p.full_name]))

  let released = 0
  const errors = []

  for (const msg of due) {
    try {
      const isExternal = !!msg.recipient_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.recipient_email)
      // Lowercase hex (not base64url): survives case-mangling by corporate
      // email link-rewriters — same reasoning as release-link.js.
      const viewToken = isExternal ? (msg.view_token || crypto.randomBytes(24).toString('hex')) : msg.view_token

      // 1. CLAIM the row (guarded on released=false). If someone manually
      //    released it between our SELECT and now, this matches 0 rows and we
      //    skip entirely — never email a token that wasn't stored.
      const { data: claimed, error: updErr } = await supabase
        .from('messages')
        .update({ released: true, released_at: new Date().toISOString(), ...(viewToken ? { view_token: viewToken } : {}) })
        .eq('id', msg.id)
        .eq('released', false)
        .select('id')
      if (updErr) throw updErr
      if (!claimed?.length) continue // lost the race — manual release already handled it

      // 2. Deliver. If the email fails, UNDO the claim so the next hourly run
      //    retries — otherwise a scheduled letter would silently never arrive.
      if (isExternal) {
        const senderName = nameOf[msg.user_id] || 'Someone'
        try {
          await resend.emails.send({
            from:    'Everstead <hello@everstead.care>',
            to:      msg.recipient_email,
            subject: `${senderName} has left you a personal message`,
            html:    messageLinkHtml(senderName, msg.recipient_name, `${BASE_URL}/m/${viewToken}`),
          })
        } catch (mailErr) {
          await supabase.from('messages')
            .update({ released: false, released_at: null }) // keep view_token — reused next run
            .eq('id', msg.id)
          throw mailErr
        }
      }
      released++
    } catch (err) {
      errors.push({ id: msg.id, error: err.message })
      captureException(err, { endpoint: 'cron/message-delivery', messageId: msg.id })
    }
  }

  return res.status(200).json({ released, errors: errors.length ? errors : undefined })
}

// Identical to api/messages/release-link.js so scheduled and manual releases
// read the same to the recipient.
function messageLinkHtml(senderName, recipientName, viewUrl) {
  const hi = recipientName ? `Dear ${escapeHtml(recipientName)},` : 'Hello,'
  return `<!DOCTYPE html><html><body style="margin:0;background:#fafaf9;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#1c1917;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <div style="background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);border-radius:16px;padding:28px;text-align:center;">
      <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="150" style="display:block;margin:0 auto;height:auto;max-width:150px;" />
      <h1 style="margin:14px 0 0;color:#fff;font-family:Georgia,serif;font-weight:400;font-size:26px;line-height:1.2;">${escapeHtml(senderName)} has left you a personal message.</h1>
    </div>
    <div style="background:#fff;border:1px solid #e7e5e4;border-top:0;border-radius:0 0 16px 16px;padding:28px;">
      <p style="margin:0 0 14px;font-size:15px;line-height:1.65;">${hi}</p>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#44403c;">${escapeHtml(senderName)} has set aside a private message for you through Everstead. You can read it using the secure link below — no account is needed.</p>
      <a href="${viewUrl}" style="display:inline-block;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#fff;font-weight:600;font-size:15px;text-decoration:none;padding:13px 26px;border-radius:9999px;">Read your message</a>
      <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#a8a29e;">This link is private to you. If you weren't expecting this, you can safely ignore it.</p>
    </div>
  </div></body></html>`
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

export default withSentry(handler)
