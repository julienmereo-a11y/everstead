import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'
import { translator, pickLang } from '../_lib/email-i18n.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend  = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

// ─────────────────────────────────────────────────────────────────────────────
// 6-month "keep your plan current" check-in
//
// Fills the re-engagement gap between onboarding (days 0-14) and the annual
// review (month 12). Fires on the 1st of each month at 10:00 UTC
// (vercel.json: "0 10 1 * *") and catches anyone who has crossed a ~6-month
// boundary since their last meaningful touch.
//
// Targets users who:
//   - subscription_status IN ('trialing', 'active'), not a delegate
//   - created at least ~5.5 months ago (so the first check-in lands around month 6)
//   - haven't had a check-in in the last ~6 months
//   - haven't had an annual review in the last ~5 months (so the two never collide)
//   - haven't opted out (notify_plan_checkin != false)
//
// Sends a calm, personalised "does your plan still reflect your life?" nudge
// in the recipient's own language (profiles.language) and stamps
// plan_checkin_sent_at.
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_MS = 30.44 * 86_400_000

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now             = new Date()
  const fiveHalfMoAgo   = new Date(now.getTime() - Math.round(5.5 * MONTH_MS)).toISOString()
  const sixMoAgo        = new Date(now.getTime() - Math.round(6 * MONTH_MS)).toISOString()
  const fiveMoAgo       = new Date(now.getTime() - Math.round(5 * MONTH_MS)).toISOString()

  const { data: candidates, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, plan, language')
    .in('subscription_status', ['trialing', 'active'])
    .neq('role', 'delegate')
    .not('email', 'is', null)
    .neq('notify_plan_checkin', false)
    .lte('created_at', fiveHalfMoAgo)
    .or(`plan_checkin_sent_at.is.null,plan_checkin_sent_at.lte.${sixMoAgo}`)
    .or(`annual_review_sent_at.is.null,annual_review_sent_at.lte.${fiveMoAgo}`)

  if (error) {
    console.error('plan-checkin query error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!candidates?.length) {
    return res.status(200).json({ sent: 0 })
  }

  let sent = 0
  const errors = []

  for (const user of candidates) {
    try {
      // Light personalisation: count vault items so the email reflects their plan.
      const [
        { count: accountCount },
        { count: documentCount },
        { count: contactCount },
      ] = await Promise.all([
        supabase.from('accounts')      .select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('documents')     .select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('trusted_people').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      const t = translator(COPY, user.language)

      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      user.email,
        subject: t('subject'),
        html:    planCheckinHtml(user.full_name, accountCount ?? 0, documentCount ?? 0, contactCount ?? 0, user.language),
      })

      await supabase
        .from('profiles')
        .update({ plan_checkin_sent_at: now.toISOString() })
        .eq('id', user.id)

      sent++
    } catch (err) {
      console.error(`plan-checkin error for ${user.email}:`, err)
      captureException(err, { endpoint: 'cron/plan-checkin' })
      errors.push(`${user.id}: ${err.message}`)
    }
  }

  console.log('plan-checkin:', { sent, errors })
  return res.status(200).json({ sent, total: candidates.length, errors })
}

// ─────────────────────────────────────────────────────────────────────────────
// COPY
// Every customer-facing string in this cron, per language. Only the customer
// receives this email, so there is nothing here to keep in English.
// ─────────────────────────────────────────────────────────────────────────────
const COPY = {
  en: {
    subject:      'Does your Everstead plan still reflect your life?',
    fallbackName: 'there',
    h1:           '{{name}}, a quiet six-month check-in.',
    intro:        "Life moves on between the big moments. A new account opened, a policy renewed, a house move, a change in who you'd trust to act for you, small things that quietly fall out of date.",
    summaryFull:  'Right now your vault holds {{accounts}}, {{documents}}, and {{contacts}}.',
    summaryEmpty: 'Your vault is still mostly empty, even ten minutes now makes a real difference to the people you love.',
    summaryTail:  'It only takes a few minutes to make sure it still reflects where your life is today.',

    countAccountsOne:  '{{n}} financial account',
    countAccountsMany: '{{n}} financial accounts',
    countDocumentsOne: '{{n}} document',
    countDocumentsMany:'{{n}} documents',
    countContactsOne:  '{{n}} trusted contact',
    countContactsMany: '{{n}} trusted contacts',

    checklistTitle: 'Worth a quick look:',
    tipAccounts:    "<strong>Anything new to add?</strong>, a recent account, pension, policy, or subscription that isn't in your vault yet.",
    tipContacts:    "<strong>Are your trusted people still right?</strong>, relationships change; make sure the people with access are still the ones you'd choose.",
    tipDocuments:   '<strong>Any documents to refresh?</strong>, an updated will, a renewed insurance policy, or a new passport.',

    cta:              'Review my plan →',
    signature:        'Julien, founder of Everstead',
    footerQuestions:  'Questions? Reply to this email or write to',
    footerUnsubscribe:'Unsubscribe from these check-ins',
  },
  fr: {
    subject:      'Votre plan Everstead reflète-t-il encore votre vie\u00A0?',
    fallbackName: 'Bonjour',
    h1:           '{{name}}, un point tranquille à six mois.',
    intro:        'La vie continue entre les grands moments. Un nouveau compte ouvert, un contrat renouvelé, un déménagement, un changement dans la personne à qui vous confieriez vos affaires, autant de petites choses qui cessent discrètement d\'être à jour.',
    summaryFull:  "Aujourd'hui, votre coffre contient {{accounts}}, {{documents}} et {{contacts}}.",
    summaryEmpty: 'Votre coffre est encore presque vide, dix minutes aujourd\'hui feraient une vraie différence pour ceux que vous aimez.',
    summaryTail:  "Quelques minutes suffisent pour vérifier qu'il correspond toujours à votre vie d'aujourd'hui.",

    countAccountsOne:  '{{n}} compte financier',
    countAccountsMany: '{{n}} comptes financiers',
    countDocumentsOne: '{{n}} document',
    countDocumentsMany:'{{n}} documents',
    countContactsOne:  '{{n}} personne de confiance',
    countContactsMany: '{{n}} personnes de confiance',

    checklistTitle: 'À vérifier rapidement\u00A0:',
    tipAccounts:    "<strong>Quelque chose de nouveau à ajouter\u00A0?</strong> Un compte, un contrat de retraite, une assurance ou un abonnement récent qui ne figure pas encore dans votre coffre.",
    tipContacts:    "<strong>Vos personnes de confiance sont-elles toujours les bonnes\u00A0?</strong> Les relations évoluent, vérifiez que celles qui ont accès sont toujours celles que vous choisiriez.",
    tipDocuments:   '<strong>Des documents à mettre à jour\u00A0?</strong> Un testament modifié, une assurance renouvelée ou un nouveau passeport.',

    cta:              'Revoir mon plan →',
    signature:        "Julien, fondateur d'Everstead",
    footerQuestions:  'Une question\u00A0? Répondez à ce message ou écrivez à',
    footerUnsubscribe:'Se désabonner de ces points réguliers',
  },
}

/**
 * Count phrase for the recipient's language. French treats 0 as singular,
 * English does not, so the English branch keeps its original wording exactly.
 */
function countPhrase(t, lang, n, oneKey, manyKey) {
  const singular = pickLang(lang) === 'fr' ? n <= 1 : n === 1
  return t(singular ? oneKey : manyKey, { n })
}

// ─────────────────────────────────────────────────────────────────────────────
// Email HTML
// ─────────────────────────────────────────────────────────────────────────────
function planCheckinHtml(name, accountCount, documentCount, contactCount, lang) {
  const t = translator(COPY, lang)
  const first = name?.split(' ')[0] || t('fallbackName')
  const hasContent = (accountCount + documentCount + contactCount) > 0

  const summary = hasContent
    ? t('summaryFull', {
        accounts:  countPhrase(t, lang, accountCount,  'countAccountsOne',  'countAccountsMany'),
        documents: countPhrase(t, lang, documentCount, 'countDocumentsOne', 'countDocumentsMany'),
        contacts:  countPhrase(t, lang, contactCount,  'countContactsOne',  'countContactsMany'),
      })
    : t('summaryEmpty')

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
            ${t('h1', { name: first })}
          </h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            ${t('intro')}
          </p>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            ${summary} ${t('summaryTail')}
          </p>

          <p style="margin:0 0 12px;color:#0d1628;font-size:15px;font-weight:bold;">${t('checklistTitle')}</p>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;width:100%;background:#f9f8f6;border-radius:10px;padding:8px;">
            <tr>
              <td style="padding:10px 14px;vertical-align:top;font-size:20px;line-height:1;">🏦</td>
              <td style="padding:10px 0;color:#4a5568;font-size:14px;line-height:1.6;">${t('tipAccounts')}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;vertical-align:top;font-size:20px;line-height:1;">🤝</td>
              <td style="padding:10px 0;color:#4a5568;font-size:14px;line-height:1.6;">${t('tipContacts')}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;vertical-align:top;font-size:20px;line-height:1;">📄</td>
              <td style="padding:10px 0;color:#4a5568;font-size:14px;line-height:1.6;">${t('tipDocuments')}</td>
            </tr>
          </table>

          <a href="${APP_URL}/dashboard"
             style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">
            ${t('cta')}
          </a>

          <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">
${t('signature')}
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            ${t('footerQuestions')} <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a>
            · <a href="mailto:hello@everstead.care?subject=Unsubscribe%20plan%20check-in" style="color:#9ca3af;">${t('footerUnsubscribe')}</a>
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
