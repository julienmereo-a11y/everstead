import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { withSentry, captureException } from '../lib/sentry.js'
import { translator, languageForUser, pickLang, DEFAULT_LANG } from '../_lib/email-i18n.js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

// The invited partner is being asked to CREATE an account, so most of the time
// they have no profile and no language of their own yet. Prefer their own
// preference when they already have one, otherwise inherit the inviter's, so a
// French household sends a French invitation.
async function inviteLanguage(secondaryEmail, inviterUserId) {
  try {
    const { data } = await supabase
      .from('profiles').select('language').ilike('email', secondaryEmail).limit(1).maybeSingle()
    if (data?.language) return pickLang(data.language)
  } catch {
    // fall through to the inviter's language
  }
  return inviterUserId ? await languageForUser(supabase, { userId: inviterUserId }) : DEFAULT_LANG
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Verify auth
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { primaryUserId, primaryName, secondaryEmail, inviteToken } = req.body
  if (!primaryUserId || !secondaryEmail || !inviteToken) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const inviteUrl = `${APP_URL}/accept-family-invite?token=${inviteToken}`

  try {
    // Recipient may be brand new to Everstead: their own language if they have
    // one, otherwise the authenticated inviter's (user.id, not the client-sent id).
    const lang = await inviteLanguage(secondaryEmail, user.id)
    const t = translator(COPY, lang)

    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      secondaryEmail,
      subject: t('subject', { name: primaryName || t('someone') }),
      html:    familyInviteHtml(primaryName, inviteUrl, lang),
    })

    res.status(200).json({ sent: true })
  } catch (err) {
    console.error('send-family-invite error:', err)
    captureException(err, { endpoint: 'emails/send-family-invite' })
    res.status(500).json({ error: err.message })
  }
}

// Customer-facing copy for this email, per language. The HTML chrome, links and
// brand names below are shared: only these strings change with the recipient's
// language.
const COPY = {
  en: {
    subject:    '{{name}} has invited you to join their Everstead+ plan',
    someone:    'Someone',
    they:       'They',
    h1:         '{{name}} has invited you to Everstead',
    intro:      '<strong>{{name}}</strong> has invited you to set up your own private Everstead vault, as part of their Everstead+ plan.',
    privacy:    "You'll have your own completely private account. <strong>{{name}}</strong> won't be able to see your documents, accounts, or wishes unless you choose to share them.",
    benefit1:   'Your own private vault, fully separate from theirs',
    benefit2:   'Organise your accounts, documents, and final wishes',
    benefit3:   'Control exactly what, if anything, you share',
    benefit4:   'Covered by their Everstead+ plan, no extra cost to you',
    cta:        'Accept invitation →',
    expiry:     "This invitation expires in 7 days. If you weren't expecting this, you can safely ignore it.",
    questions:  'Questions?',
  },
  fr: {
    subject:    '{{name}} vous invite à rejoindre son forfait Everstead+',
    someone:    'Quelqu\'un',
    they:       'Cette personne',
    h1:         '{{name}} vous invite sur Everstead',
    intro:      '<strong>{{name}}</strong> vous invite à créer votre propre coffre privé Everstead, dans le cadre de son forfait Everstead+.',
    privacy:    'Vous aurez votre propre compte, entièrement privé. <strong>{{name}}</strong> ne pourra voir ni vos documents, ni vos comptes, ni vos volontés, sauf si vous choisissez de les partager.',
    benefit1:   'Votre coffre privé, entièrement séparé du sien',
    benefit2:   'Organisez vos comptes, vos documents et vos dernières volontés',
    benefit3:   'Vous décidez de ce que vous partagez, ou de ne rien partager',
    benefit4:   'Inclus dans son forfait Everstead+, sans frais supplémentaires pour vous',
    cta:        'Accepter l\'invitation →',
    expiry:     'Cette invitation expire dans 7 jours. Si vous ne l\'attendiez pas, vous pouvez simplement l\'ignorer.',
    questions:  'Une question ?',
  },
}

function familyInviteHtml(primaryName, inviteUrl, lang) {
  const t = translator(COPY, lang)
  // Escape the inviter's name before it enters the email HTML (inviteUrl is server-built).
  primaryName = String(primaryName ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
  const items = [
    t('benefit1'),
    t('benefit2'),
    t('benefit3'),
    t('benefit4'),
  ]
  const listItems = items.map(item =>
    `<tr>
      <td style="padding:0 0 10px;vertical-align:top;width:20px;color:#4c7d47;font-size:15px;">✓</td>
      <td style="padding:0 0 10px;color:#4a5568;font-size:15px;line-height:1.5;">${item}</td>
    </tr>`
  ).join('')

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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;line-height:1.3;">
            ${t('h1', { name: primaryName || t('someone') })}
          </h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">
            ${t('intro', { name: primaryName || t('someone') })}
          </p>
          <p style="margin:0 0 20px;color:#4a5568;font-size:16px;line-height:1.6;">
            ${t('privacy', { name: primaryName || t('they') })}
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            ${listItems}
          </table>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);border-radius:9999px;">
              <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;">${t('cta')}</a>
            </td></tr>
          </table>
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            ${t('expiry')}
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            ${t('questions')} <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a><br />
            <span style="display:block;margin-top:8px;">Julien, Everstead</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
