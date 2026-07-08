import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from './lib/sentry.js'
import { rateLimited } from './_lib/rate-limit.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)
const FEEDBACK_TO = process.env.FEEDBACK_TO || 'julien@everstead.care'

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Public endpoint — throttle to stop mass email/abuse.
  if (await rateLimited(req, 'feedback', { max: 8, windowMinutes: 15 })) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' })
  }

  const { userId, email, name, rating, category, message, page, plan } = req.body || {}
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Please add a short message.' })
  }

  const clean = {
    user_id:  userId || null,
    email:    email || null,
    name:     name || null,
    rating:   typeof rating === 'number' ? rating : null,
    category: category || null,
    message:  message.trim().slice(0, 4000),
    page:     page || null,
    plan:     plan || null,
  }

  // Store (best-effort — don't block the email on a DB hiccup)
  try {
    await supabase.from('feedback').insert(clean)
  } catch (err) {
    console.error('[feedback] insert error:', err)
    captureException(err, { endpoint: 'feedback', stage: 'insert' })
  }

  // Email the founder
  try {
    const stars = clean.rating ? '★'.repeat(clean.rating) + '☆'.repeat(5 - clean.rating) : '—'
    const rows = [
      ['From',     clean.name ? `${clean.name}${clean.email ? ` (${clean.email})` : ''}` : (clean.email || 'Anonymous')],
      ['Rating',   stars],
      ['Category', clean.category || '—'],
      ['Plan',     clean.plan || '—'],
      ['Page',     clean.page || '—'],
    ].map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:600;color:#374151;white-space:nowrap;vertical-align:top;">${k}</td><td style="padding:6px 12px;color:#4b5563;">${escapeHtml(v)}</td></tr>`).join('')

    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      FEEDBACK_TO,
      replyTo: clean.email || undefined,
      subject: `💬 Feedback${clean.category ? ` (${clean.category})` : ''}${clean.rating ? ` · ${clean.rating}/5` : ''} — ${clean.name || clean.email || 'user'}`,
      html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px;background:#f9fafb;font-family:system-ui,sans-serif;">
  <table style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:20px 24px;"><p style="margin:0;color:#fff;font-size:16px;font-weight:600;">New in-app feedback</p></td></tr>
    <tr><td style="padding:22px 24px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">${rows}</table>
      <div style="background:#f9f8f6;border-left:3px solid #4c7d47;border-radius:4px;padding:16px 18px;">
        <p style="margin:0;color:#1f2937;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(clean.message)}</p>
      </div>
      ${clean.email ? `<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Reply to this email to respond directly to ${escapeHtml(clean.email)}.</p>` : ''}
    </td></tr>
  </table>
</body></html>`,
    })
  } catch (err) {
    console.error('[feedback] email error:', err)
    captureException(err, { endpoint: 'feedback', stage: 'email' })
    // Still a success for the user if the DB insert worked.
  }

  return res.status(200).json({ ok: true })
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
