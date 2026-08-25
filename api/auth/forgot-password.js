import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry } from '../lib/sentry.js'
import { translator, languageForUser } from '../_lib/email-i18n.js'

// Service role bypasses Supabase captcha protection
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const resend   = new Resend(process.env.RESEND_API_KEY)

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Missing email' })

  // Recipient language, resolved before the branch below so an unknown address
  // does exactly the same work as a known one. languageForUser never throws and
  // returns 'en' when there is no profile, so this stays enumeration-safe: the
  // response is still an unconditional { sent: true }.
  const lang = await languageForUser(supabase, { email })
  const t    = translator(COPY, lang)

  // Always return success — don't reveal whether the email exists
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${process.env.VITE_APP_URL}/reset-password` },
  })

  if (!error && data?.properties?.action_link) {
    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      email,
      subject: t('subject'),
      html:    resetHtml(data.properties.action_link, lang),
    }).catch(err => console.error('forgot-password email error:', err))
  }

  res.status(200).json({ sent: true })
}

// Customer-facing copy, per recipient language (profiles.language).
// French strings carry a real NBSP (U+00A0) before ? ! ; : and %, as French
// typography requires. Do not "tidy" those into ordinary spaces.
const COPY = {
  en: {
    subject:   'Reset your Everstead password',
    h1:        'Reset your password',
    intro:     'We received a request to reset your Everstead password. Click the button below to choose a new one.',
    cta:       'Reset my password →',
    expiry:    "This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.",
    questions: 'Questions?',
  },
  fr: {
    subject:   'Réinitialisez votre mot de passe Everstead',
    h1:        'Réinitialisez votre mot de passe',
    intro:     'Nous avons reçu une demande de réinitialisation de votre mot de passe Everstead. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.',
    cta:       'Réinitialiser mon mot de passe →',
    expiry:    "Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail en toute sécurité.",
    questions: 'Une question ?',
  },
}

function resetHtml(resetLink, lang) {
  const t = translator(COPY, lang)
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:28px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160"
               style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:44px 40px 36px;">
          <h1 style="margin:0 0 12px;color:#0d1628;font-size:26px;font-weight:normal;font-family:Georgia,serif;line-height:1.3;">
            ${t('h1')}
          </h1>
          <p style="margin:0 0 20px;color:#5a6475;font-size:15px;line-height:1.7;font-family:Georgia,serif;">
            ${t('intro')}
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
            <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);border-radius:9999px;">
              <a href="${resetLink}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-family:Georgia,serif;font-size:15px;letter-spacing:0.3px;">
                ${t('cta')}
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;line-height:1.6;font-family:Georgia,serif;">
            ${t('expiry')}
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px 32px;border-top:1px solid #ede9e3;">
          <p style="margin:0;color:#b0b8c1;font-size:12px;line-height:1.6;font-family:Georgia,serif;">
            ${t('questions')} <a href="mailto:support@everstead.care" style="color:#4c7d47;text-decoration:none;">support@everstead.care</a>
          </p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;color:#c4bfb8;font-size:11px;text-align:center;font-family:Georgia,serif;">Everstead · everstead.care</p>
    </td></tr>
  </table>
</body>
</html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
