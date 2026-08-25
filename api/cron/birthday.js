import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'
import { translator } from '../_lib/email-i18n.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend  = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

const MILESTONE_AGES = [40, 50, 60, 65, 70]

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Fetch profiles whose birthday is today (matching month + day),
  // active/trialing, non-advisor, with a date_of_birth set
  const { data: candidates, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, language, date_of_birth, birthday_email_year, notify_birthday')
    .in('subscription_status', ['trialing', 'active'])
    .eq('is_advisor', false)
    .not('date_of_birth', 'is', null)
    .not('email', 'is', null)
    .filter('date_of_birth', 'not.is', null)
    .neq('notify_birthday', false)

  if (error) {
    console.error('birthday query error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!candidates?.length) {
    return res.status(200).json({ sent: 0 })
  }

  const today        = new Date()
  const todayMonth   = today.getMonth() + 1  // 1-based
  const todayDay     = today.getDate()
  const currentYear  = today.getFullYear()

  // Filter to today's birthdays in JS (avoids Supabase EXTRACT quirks)
  const todayBirthdays = candidates.filter(p => {
    const dob = new Date(p.date_of_birth)
    return (
      dob.getUTCMonth() + 1 === todayMonth &&
      dob.getUTCDate()      === todayDay
    )
  })

  // Safety guard: skip anyone already emailed this calendar year
  const toEmail = todayBirthdays.filter(p => p.birthday_email_year !== currentYear)

  let sent = 0
  const errors = []

  for (const user of toEmail) {
    try {
      const age = currentYear - new Date(user.date_of_birth).getUTCFullYear()
      // Recipient is the account owner, so their own profiles.language decides.
      const t     = translator(COPY, user.language)
      const first = user.full_name?.split(' ')[0]

      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      user.email,
        subject: first ? t('subject', { name: first }) : t('subjectAnon'),
        html:    birthdayHtml(user.full_name, age, user.language),
      })

      await supabase
        .from('profiles')
        .update({ birthday_email_year: currentYear })
        .eq('id', user.id)

      sent++
    } catch (err) {
      console.error(`birthday error for ${user.email}:`, err)
      captureException(err, { endpoint: 'cron/birthday' })
      errors.push(`${user.id}: ${err.message}`)
    }
  }

  console.log('birthday cron:', { sent, total: toEmail.length, errors })
  return res.status(200).json({ sent, total: toEmail.length, errors })
}

// ─────────────────────────────────────────────────────────────────────────────
// Email copy, per language. The nameless variants keep the English wording that
// shipped before ("there"), while French can drop the placeholder entirely.
// ─────────────────────────────────────────────────────────────────────────────
const COPY = {
  en: {
    subject:     'Happy birthday, {{name}} 🎂',
    subjectAnon: 'Happy birthday, there 🎂',
    h1:          'Happy birthday, {{name}}!',
    h1Anon:      'Happy birthday, there!',
    intro:       'Today is a great day to take a moment for yourself, and maybe a few minutes for the people you love.',
    milestone:   "Turning {{age}} is one of those milestone birthdays that often prompts people to think about their finances and estate. If you haven't reviewed your plan recently, today might be the perfect day.",
    wishes:      'Wishing you a wonderful birthday.',
    cta:         'Review my plan →',
    signoff:     'The Everstead team',
    footer:      'Questions? Reply to this email or write to',
    unsubscribe: 'Unsubscribe',
  },
  fr: {
    subject:     'Joyeux anniversaire, {{name}} 🎂',
    subjectAnon: 'Joyeux anniversaire 🎂',
    h1:          'Joyeux anniversaire, {{name}} !',
    h1Anon:      'Joyeux anniversaire !',
    intro:       'C\'est une belle journée pour prendre un moment pour vous, et peut-être quelques minutes pour ceux que vous aimez.',
    milestone:   'Avoir {{age}} ans fait partie de ces anniversaires marquants qui invitent à faire le point sur ses finances et sa succession. Si vous n\'avez pas revu votre plan depuis un moment, c\'est peut-être le jour idéal.',
    wishes:      'Nous vous souhaitons un très bel anniversaire.',
    cta:         'Revoir mon plan →',
    signoff:     'L\'équipe Everstead',
    footer:      'Une question ? Répondez à cet e-mail ou écrivez à',
    unsubscribe: 'Se désabonner',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Email template
// ─────────────────────────────────────────────────────────────────────────────
function birthdayHtml(name, age, lang) {
  const t     = translator(COPY, lang)
  const first = name?.split(' ')[0]

  const milestoneParagraph = MILESTONE_AGES.includes(age)
    ? `<p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
        ${t('milestone', { age })}
      </p>`
    : ''

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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
            ${first ? t('h1', { name: first }) : t('h1Anon')}
          </h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            ${t('intro')}
          </p>
          ${milestoneParagraph}
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
            ${t('wishes')}
          </p>
          <a href="${APP_URL}/dashboard"
             style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">
            ${t('cta')}
          </a>
          <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">
${t('signoff')}
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            ${t('footer')} <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a>
            · <a href="mailto:hello@everstead.care?subject=Unsubscribe" style="color:#9ca3af;">${t('unsubscribe')}</a>
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
