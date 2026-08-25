import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'
import { planLabel } from '../_lib/plan-label.js'
import { translator } from '../_lib/email-i18n.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend  = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

// Re-engagement nudge for low-progress users.
//
// Fires weekly (Mondays 10:00 UTC via vercel.json cron).
// Targets users who:
//   - Completed checkout (have a stripe_subscription_id)
//   - Are 7+ days into their trial
//   - Have a low readiness score: fewer than 2 of the 3 core actions done
//     (add an account, invite a trusted contact, upload a document)
//   - Have not yet received a re-engagement nudge (or it was sent 14+ days ago)
//
// The email is personalised to highlight specifically what's missing, and is
// written in the recipient's own language (profiles.language).

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now               = new Date()
  const sevenDaysAgo      = new Date(now.getTime() - 7  * 86_400_000).toISOString()
  const fourteenDaysAgo   = new Date(now.getTime() - 14 * 86_400_000).toISOString()

  // Fetch candidates: free-tier users (no subscription) plus trialing/active paid
  // users, signed up 7+ days ago, not nudged yet or last nudge was 14+ days ago.
  // Free users are the activation target, so they must be nudged too — they have
  // no stripe_subscription_id and a null subscription_status, so both are matched
  // via plan='free' rather than the paid-status filter.
  const { data: candidates, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, plan, language, notify_reengagement, notify_vault_nudges')
    .or('subscription_status.in.(trialing,active),plan.eq.free')
    .neq('role', 'delegate')
    .not('email', 'is', null)
    .lte('created_at', sevenDaysAgo)
    .or(`reengagement_nudge_sent_at.is.null,reengagement_nudge_sent_at.lte.${fourteenDaysAgo}`)
    .neq('notify_reengagement', false)
    .neq('marketing_emails_enabled', false) // respect unsubscribe

  if (error) {
    console.error('reengagement query error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!candidates?.length) {
    return res.status(200).json({ sent: 0 })
  }

  let sent = 0
  const errors = []

  for (const user of candidates) {
    try {
      // Check which core actions the user has completed
      const [
        { count: accountCount },
        { count: contactCount },
        { count: documentCount },
      ] = await Promise.all([
        supabase.from('accounts')      .select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('trusted_people').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('documents')     .select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      const hasAccounts  = (accountCount  ?? 0) > 0
      const hasContacts  = (contactCount  ?? 0) > 0
      const hasDocuments = (documentCount ?? 0) > 0
      const score        = [hasAccounts, hasContacts, hasDocuments].filter(Boolean).length

      // Only nudge if readiness score is low (fewer than 2 of 3 done)
      if (score >= 2) continue

      const missing = [
        !hasAccounts  && 'accounts',
        !hasContacts  && 'contacts',
        !hasDocuments && 'documents',
      ].filter(Boolean)

      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      user.email,
        subject: nudgeSubject(missing, user.language),
        html:    nudgeHtml(user.full_name, user.plan, hasAccounts, hasContacts, hasDocuments, user.id, user.language),
      })

      await supabase
        .from('profiles')
        .update({ reengagement_nudge_sent_at: now.toISOString() })
        .eq('id', user.id)

      sent++
    } catch (err) {
      console.error(`reengagement error for ${user.email}:`, err)
      captureException(err, { endpoint: 'cron/reengagement' })
      errors.push(`${user.id}: ${err.message}`)
    }
  }

  console.log('reengagement:', { sent, errors })
  return res.status(200).json({ sent, total: candidates.length, errors })
}

// ─────────────────────────────────────────────────────────────────────────────
// COPY
// Every customer-facing string in this cron, per language. This email only ever
// goes to the customer, so nothing here stays English on purpose.
// ─────────────────────────────────────────────────────────────────────────────
const COPY = {
  en: {
    subjectEmpty:    "Your Everstead plan is still empty, let's fix that",
    subjectContacts: 'One thing missing from your Everstead plan',
    subjectAccounts: "Your financial accounts aren't in Everstead yet",
    subjectAlmost:   'Your estate plan is almost complete',

    fallbackName: 'there',
    h1:           '{{name}}, your plan is almost ready.',
    intro:        'You started your <strong>{{plan}}</strong> plan, great first step. A few things left to make your estate plan genuinely useful if something unexpected happens:',

    accountsDone:  'Financial accounts added',
    accountsTodo:  '<strong>Add a financial account</strong>, bank, pension, investment, or property',
    contactsDone:  'Trusted contact invited',
    contactsTodo:  '<strong>Invite a trusted contact</strong>, someone who should have access to your plan',
    documentsDone: 'Document uploaded to your vault',
    documentsTodo: '<strong>Upload a document</strong>, your will, passport, pension statement',

    cta:              'Continue my plan →',
    signature:        'Julien, founder of Everstead',
    footerQuestions:  'Questions? Reply to this email or write to',
    footerUnsubscribe:'Unsubscribe',
  },
  fr: {
    subjectEmpty:    'Votre plan Everstead est encore vide, remédions à cela',
    subjectContacts: 'Il manque une chose à votre plan Everstead',
    subjectAccounts: 'Vos comptes financiers ne sont pas encore dans Everstead',
    subjectAlmost:   'Votre plan de succession est presque complet',

    fallbackName: 'Bonjour',
    h1:           '{{name}}, votre plan est presque prêt.',
    intro:        "Vous avez démarré votre forfait <strong>{{plan}}</strong>, c'est un bon début. Il reste quelques éléments pour que votre plan de succession soit vraiment utile en cas d'imprévu\u00A0:",

    accountsDone:  'Comptes financiers ajoutés',
    accountsTodo:  '<strong>Ajoutez un compte financier</strong>, banque, retraite, placement ou bien immobilier',
    contactsDone:  'Personne de confiance invitée',
    contactsTodo:  "<strong>Invitez une personne de confiance</strong>, quelqu'un qui doit avoir accès à votre plan",
    documentsDone: 'Document ajouté à votre coffre',
    documentsTodo: '<strong>Ajoutez un document</strong>, votre testament, votre passeport, un relevé de retraite',

    cta:              'Continuer mon plan →',
    signature:        "Julien, fondateur d'Everstead",
    footerQuestions:  'Une question\u00A0? Répondez à ce message ou écrivez à',
    footerUnsubscribe:'Se désabonner',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic subject based on what's missing
// ─────────────────────────────────────────────────────────────────────────────
function nudgeSubject(missing, lang) {
  const t = translator(COPY, lang)
  if (missing.includes('contacts') && missing.includes('accounts')) {
    return t('subjectEmpty')
  }
  if (missing.includes('contacts')) {
    return t('subjectContacts')
  }
  if (missing.includes('accounts')) {
    return t('subjectAccounts')
  }
  return t('subjectAlmost')
}

// ─────────────────────────────────────────────────────────────────────────────
// Personalised nudge email
// ─────────────────────────────────────────────────────────────────────────────
function nudgeHtml(name, plan, hasAccounts, hasContacts, hasDocuments, userId, lang) {
  const t        = translator(COPY, lang)
  const first    = name?.split(' ')[0] || t('fallbackName')
  const unsubUrl = userId
    ? `${APP_URL}/api/email/unsubscribe?token=${Buffer.from(userId).toString('base64url')}`
    : `mailto:hello@everstead.care?subject=Unsubscribe`
  const planName = planLabel(plan)

  // Build a checklist showing what's done and what's missing
  const checklistItems = [
    {
      done:  hasAccounts,
      icon:  hasAccounts ? '✅' : '⬜',
      label: hasAccounts
        ? t('accountsDone')
        : t('accountsTodo'),
      href:  `${APP_URL}/dashboard`,
    },
    {
      done:  hasContacts,
      icon:  hasContacts ? '✅' : '⬜',
      label: hasContacts
        ? t('contactsDone')
        : t('contactsTodo'),
      href:  `${APP_URL}/dashboard`,
    },
    {
      done:  hasDocuments,
      icon:  hasDocuments ? '✅' : '⬜',
      label: hasDocuments
        ? t('documentsDone')
        : t('documentsTodo'),
      href:  `${APP_URL}/dashboard`,
    },
  ]

  const checklistRows = checklistItems.map(item => `
    <tr>
      <td style="padding:10px 14px;vertical-align:top;font-size:18px;line-height:1;">${item.icon}</td>
      <td style="padding:10px 0;color:${item.done ? '#6b7280' : '#1a202c'};font-size:14px;line-height:1.6;${item.done ? 'text-decoration:line-through;' : ''}">${item.label}</td>
    </tr>
  `).join('')

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
            ${t('intro', { plan: planName })}
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:24px 0 32px;width:100%;background:#f9f8f6;border-radius:10px;padding:8px;">
            ${checklistRows}
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
            · <a href="${unsubUrl}" style="color:#9ca3af;">${t('footerUnsubscribe')}</a>
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
