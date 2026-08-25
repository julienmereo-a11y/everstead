import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'
import { withSentry, captureException } from '../lib/sentry.js'
import { translator, pickLang } from '../_lib/email-i18n.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://www.everstead.care'

// Release a sealed personal message to an UNREGISTERED recipient (an email
// address). Generates a one-time secure view token, marks the message released,
// and emails the recipient a private link to view it — no account required.
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.replace('Bearer ', '')
  const { messageId } = req.body || {}
  if (!token || !messageId) return res.status(400).json({ error: 'Missing fields' })

  // Verify the caller
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' })

  // Fetch the message and confirm ownership + that it targets an email
  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .select('id, user_id, title, recipient_name, recipient_email, view_token')
    .eq('id', messageId)
    .single()

  if (msgErr || !msg) return res.status(404).json({ error: 'Message not found' })
  if (msg.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' })
  if (!msg.recipient_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.recipient_email)) {
    return res.status(400).json({ error: 'This message has no valid external email recipient' })
  }

  // Reuse an existing token if already released once, else mint a new one.
  // Use lowercase hex (not base64url) so the token survives case-mangling by
  // corporate email link-rewriters (Safe Links / Proofpoint), which can change
  // the case of a path and would otherwise break a case-sensitive token.
  const viewToken = msg.view_token || crypto.randomBytes(24).toString('hex')

  const { error: updErr } = await supabase
    .from('messages')
    .update({ released: true, released_at: new Date().toISOString(), view_token: viewToken })
    .eq('id', messageId)
  if (updErr) return res.status(500).json({ error: 'Could not release the message' })

  // Sender display name (for a personal touch) and language
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, language')
    .eq('id', user.id)
    .single()

  // The recipient is unregistered by definition here, so there is usually no
  // profile to read a preference from: inherit the sender's language so a
  // French family is written to in French. An existing account still wins.
  const lang = await recipientLang(msg.recipient_email, profile?.language)
  const t = translator(COPY, lang)
  const senderName = profile?.full_name || t('senderFallback')

  const viewUrl = `${BASE_URL}/m/${viewToken}`

  try {
    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      msg.recipient_email,
      subject: t('subject', { name: senderName }),
      html:    messageLinkHtml(senderName, msg.recipient_name, viewUrl, lang),
    })
  } catch (err) {
    console.error('release-link: email error:', err.message)
    captureException(err, { endpoint: 'messages/release-link' })
    return res.status(502).json({ error: 'Message released, but the email could not be sent.' })
  }

  return res.status(200).json({ ok: true, viewUrl })
}

// Recipient's own preference wins when they are an Everstead user; otherwise the
// sender's language carries over. Never throws: an unknown recipient falls back
// to the sender, and an unknown sender to English via pickLang.
async function recipientLang(email, senderLanguage) {
  try {
    const { data } = await supabase
      .from('profiles').select('language').ilike('email', email).limit(1).maybeSingle()
    if (data?.language) return pickLang(data.language)
  } catch {
    // fall through to the sender's language
  }
  return pickLang(senderLanguage)
}

// Customer-facing copy for the release email. This is a bereavement message in
// most cases, so the French stays calm, warm and sober. Kept byte-for-byte in
// step with api/cron/message-delivery.js.
const COPY = {
  en: {
    subject:        '{{name}} has left you a personal message',
    senderFallback: 'Someone',
    h1:             '{{name}} has left you a personal message.',
    greeting:       'Dear {{name}},',
    greetingAnon:   'Hello,',
    body:           '{{name}} has set aside a private message for you through Everstead. You can read it using the secure link below, no account is needed.',
    cta:            'Read your message',
    note:           "This link is private to you. If you weren't expecting this, you can safely ignore it.",
  },
  fr: {
    subject:        '{{name}} vous a laissé un message personnel',
    senderFallback: 'Quelqu\'un',
    h1:             '{{name}} vous a laissé un message personnel.',
    greeting:       'Bonjour {{name}},',
    greetingAnon:   'Bonjour,',
    body:           '{{name}} a mis de côté un message privé à votre intention sur Everstead. Vous pouvez le lire en suivant le lien sécurisé ci-dessous, sans avoir besoin de créer un compte.',
    cta:            'Lire votre message',
    note:           'Ce lien vous est personnel. Si vous ne l\'attendiez pas, vous pouvez simplement l\'ignorer.',
  },
}

function messageLinkHtml(senderName, recipientName, viewUrl, lang) {
  const t  = translator(COPY, lang)
  const hi = recipientName ? t('greeting', { name: escapeHtml(recipientName) }) : t('greetingAnon')
  return `<!DOCTYPE html><html><body style="margin:0;background:#fafaf9;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#1c1917;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <div style="background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);border-radius:16px;padding:28px;text-align:center;">
      <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="150" style="display:block;margin:0 auto;height:auto;max-width:150px;" />
      <h1 style="margin:14px 0 0;color:#fff;font-family:Georgia,serif;font-weight:400;font-size:26px;line-height:1.2;">${t('h1', { name: escapeHtml(senderName) })}</h1>
    </div>
    <div style="background:#fff;border:1px solid #e7e5e4;border-top:0;border-radius:0 0 16px 16px;padding:28px;">
      <p style="margin:0 0 14px;font-size:15px;line-height:1.65;">${hi}</p>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#44403c;">${t('body', { name: escapeHtml(senderName) })}</p>
      <a href="${viewUrl}" style="display:inline-block;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#fff;font-weight:600;font-size:15px;text-decoration:none;padding:13px 26px;border-radius:9999px;">${t('cta')}</a>
      <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#a8a29e;">${t('note')}</p>
    </div>
  </div></body></html>`
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
