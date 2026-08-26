import { Resend } from 'resend'
import { requireAdmin, adminDb } from '../_lib/admin-auth.js'
import { withSentry, captureException } from '../lib/sentry.js'
import { translator, languageForUser, pickLang, DEFAULT_LANG } from '../_lib/email-i18n.js'
import { planLabel } from '../_lib/plan-label.js'

const resend = new Resend(process.env.RESEND_API_KEY)

// Escape user-supplied text before interpolating into email HTML.
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Who may send what. This endpoint sends branded email from hello@everstead.care, so
// every type is gated: admin-only types need an admin JWT; account types need any
// valid user JWT; invite-accepted may instead prove itself with the invite token
// (delegates accept without a session). Only the lead-gen tool report is public.
const ADMIN_TYPES = new Set(['admin', 'admin-direct', 'info-request'])
const USER_TYPES  = new Set(['welcome', 'invite', 'owner-registration'])

async function verifyUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return false
  const { data: { user }, error } = await adminDb.auth.getUser(token)
  return !error && !!user
}

async function verifyInviteToken(inviteToken) {
  if (!inviteToken) return false
  const { data } = await adminDb.from('trusted_people')
    .select('id').eq('invite_token', inviteToken).maybeSingle()
  return !!data
}

// ── Recipient language helpers ────────────────────────────────
// Some recipients here are NOT the account owner (an invited trusted person, the
// person who reported a death). They may have no profile at all, so their own
// preference is tried first and an inherited language is the fallback.
async function langForOutsider(email, inherit) {
  try {
    const { data } = await adminDb
      .from('profiles').select('language').ilike('email', email).limit(1).maybeSingle()
    if (data?.language) return pickLang(data.language)
  } catch {
    // fall through to the inherited language
  }
  return pickLang(inherit)
}

// Vault owner behind an invite token: an invited trusted person usually has no
// account yet, so the owner's language is the sensible inheritance.
async function ownerLangForInvite(inviteToken) {
  try {
    if (!inviteToken) return DEFAULT_LANG
    const { data } = await adminDb.from('trusted_people')
      .select('user_id').eq('invite_token', inviteToken).maybeSingle()
    if (!data?.user_id) return DEFAULT_LANG
    return await languageForUser(adminDb, { userId: data.user_id })
  } catch {
    return DEFAULT_LANG
  }
}

// Vault owner behind a submitted report: the reporter is a trusted person of the
// deceased, so when they have no account of their own the owner's language is
// the closest match to the household we are writing to.
async function ownerLangForReporter(reporterEmail) {
  try {
    const { data } = await adminDb.from('reports')
      .select('owner_id')
      .ilike('reporter_email', reporterEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data?.owner_id) return DEFAULT_LANG
    return await languageForUser(adminDb, { userId: data.owner_id })
  } catch {
    return DEFAULT_LANG
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { type, ...body } = req.body
  if (!type) return res.status(400).json({ error: 'Missing type' })

  if (ADMIN_TYPES.has(type)) {
    const admin = await requireAdmin(req)
    if (!admin) return res.status(403).json({ error: 'Forbidden' })
  } else if (USER_TYPES.has(type)) {
    if (!(await verifyUser(req))) return res.status(401).json({ error: 'Unauthorized' })
  } else if (type === 'invite-accepted') {
    const ok = (await verifyUser(req)) || (await verifyInviteToken(body.inviteToken))
    if (!ok) return res.status(401).json({ error: 'Unauthorized' })
  }
  // 'tool-report' stays public — the Estate Readiness Score lead tool.

  try {
    if (type === 'welcome') {
      const { name, email, plan } = body
      if (!email) return res.status(400).json({ error: 'Missing email' })
      // Recipient is the new account holder, so their own profiles.language decides.
      const lang = await languageForUser(adminDb, { email })
      const t = translator(COPY, lang)
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      email,
        subject: t('welcomeSubject'),
        html:    welcomeHtml(name, plan, lang),
      })

    } else if (type === 'invite-accepted') {
      const { ownerName, ownerEmail, inviteeName, role } = body
      if (!ownerEmail) return res.status(400).json({ error: 'Missing ownerEmail' })
      // Recipient is the vault owner, so their own profiles.language decides.
      const lang = await languageForUser(adminDb, { email: ownerEmail })
      const t = translator(COPY, lang)
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      ownerEmail,
        subject: t('acceptedSubject', { name: inviteeName || t('someone') }),
        html:    inviteAcceptedHtml(ownerName, inviteeName, role, lang),
      })

    } else if (type === 'admin') {
      const { inviteeEmail, inviteUrl } = body
      if (!inviteeEmail) return res.status(400).json({ error: 'Missing inviteeEmail' })
      // Everstead admin team invite: an internal notification, kept in English.
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      inviteeEmail,
        subject: "You've been invited to join the Everstead admin team",
        html:    adminInviteHtml(inviteeEmail, inviteUrl),
      })

    } else if (type === 'invite') {
      const { inviteeName, inviteeEmail, role, ownerName, inviteToken } = body
      if (!inviteeEmail) return res.status(400).json({ error: 'Missing inviteeEmail' })
      // The invited trusted person is often not an Everstead user yet: their own
      // profile language when they have one, otherwise the vault owner's, so a
      // French household sends a French invitation.
      const lang = await langForOutsider(inviteeEmail, await ownerLangForInvite(inviteToken))
      const t = translator(COPY, lang)
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      inviteeEmail,
        subject: t('inviteSubject', { name: ownerName || t('someone') }),
        html:    inviteHtml(inviteeName, ownerName, role, inviteToken, lang),
      })

    } else if (type === 'tool-report') {
      // Estate Readiness Score — full report email (no auth required, public tool)
      const { name, email, score, answers } = body
      if (!email) return res.status(400).json({ error: 'Missing email' })
      // Basic email validation — prevent abuse
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email' })
      }
      // A public lead with no sender to inherit from: their profile language if
      // they already hold an Everstead account, English otherwise. The score tool
      // itself is English-only today, so that is the honest default.
      const lang = await languageForUser(adminDb, { email })
      const t = translator(COPY, lang)
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      email,
        subject: t('toolSubject', { score }),
        html:    toolReportHtml(name, score, answers, lang),
      })

    } else if (type === 'owner-registration') {
      // Fires immediately on signup, before Stripe checkout.
      // Founder notification to julien@everstead.care: always English.
      const { name, email, plan, billingCycle } = body
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      'julien@everstead.care',
        subject: `🆕 New registration, ${name || email} (${plan || 'essential'})`,
        html:    ownerRegistrationHtml({ name, email, plan, billingCycle }),
      })

    } else if (type === 'admin-direct') {
      // Admin emailing a user directly from the panel. Subject and body are
      // written by the admin and sent verbatim; only the greeting and footer
      // chrome follow the recipient's own profiles.language.
      const { to, toName, subject, message } = body
      if (!to || !subject || !message) return res.status(400).json({ error: 'Missing to, subject, or message' })
      const lang = await languageForUser(adminDb, { email: to })
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to,
        subject,
        html:    adminDirectHtml(toName, subject, message, lang),
      })

    } else if (type === 'info-request') {
      // Admin requesting more info from a report submitter
      const { to, reporterName, ownerName, message } = body
      if (!to || !message) return res.status(400).json({ error: 'Missing to or message' })
      // The reporter is a trusted person who may have no account: their own
      // profile language if they have one, otherwise the language of the vault
      // owner whose report this is.
      const lang = await langForOutsider(to, await ownerLangForReporter(to))
      const t = translator(COPY, lang)
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to,
        subject: t('infoSubject'),
        html:    infoRequestHtml(reporterName, ownerName, message, lang),
      })

    } else {
      return res.status(400).json({ error: `Unknown type: ${type}` })
    }

    res.status(200).json({ sent: true })
  } catch (err) {
    console.error('send email error:', err)
    captureException(err, { endpoint: 'emails/send' })
    res.status(500).json({ error: err.message })
  }
}

// ── Email copy ────────────────────────────────────────────────
// Customer-facing strings for every localised template in this file, per
// language. The two English-only templates below (Everstead admin team invite,
// founder registration notification) are deliberately absent: they are internal
// notifications and stay in English whatever the recipient's profile says.
//
// Brand and plan names (Everstead, Everstead+, Everstead Pro, Essential), links,
// email addresses and invite tokens are never translated.
const COPY = {
  en: {
    // shared
    someone:              'Someone',
    there:                'there',
    questions:            'Questions?',
    needHelp:             'Need help?',

    // welcome
    welcomeSubject:       'Welcome to Everstead',
    welcomeH1:            'Welcome, {{name}}',
    welcomeIntroFree:     "Thank you for joining Everstead. You're on the <strong>{{plan}}</strong> plan (free forever, with no card required.",
    welcomeIntroTrial:    "Thank you for joining Everstead. You're on the <strong>{{plan}}</strong> plan) your 14-day free trial starts now.",
    welcomeBody1:         'Everstead helps you organise everything your family needs to know (accounts, documents, contacts, and instructions) all in one secure, private place.',
    welcomeBody2:         'Start by adding your first account or uploading an important document.',
    welcomeCta:           'Go to your dashboard →',

    // invite accepted (to the vault owner)
    acceptedSubject:      '{{name}} has accepted your invite',
    acceptedContactCap:   'Your contact',
    acceptedContact:      'your contact',
    acceptedH1:           '{{name}} has accepted your invite',
    acceptedBody:         'Hi {{owner}}, <strong>{{invitee}}</strong>{{role}} has accepted your Everstead invitation and can now access their permitted sections of your estate plan.',
    acceptedBody2:        'You can review and manage their access permissions from your dashboard at any time.',
    acceptedCta:          'View dashboard →',

    // trusted person invite
    inviteSubject:        '{{name}} has invited you to their Everstead plan',
    inviteH1Named:        "You've been invited to <strong>{{name}}</strong>'s estate plan",
    inviteH1Anon:         "You've been invited to an estate plan",
    inviteGreetingNamed:  'Hi {{name}},',
    inviteGreetingAnon:   'Hi,',
    inviteRoleFallback:   'trusted contact',
    inviteBody:           '<strong>{{owner}}</strong> has added you as their <strong>{{role}}</strong> on Everstead, a secure digital estate plan that ensures their wishes and important information are organised and accessible when needed.',
    inviteBody2:          "Create your free account to accept the invitation and view the sections you've been given access to.",
    inviteCta:            'Accept invitation →',
    inviteIgnore:         "If you weren't expecting this invitation, you can safely ignore this email.",

    // estate readiness report
    toolSubject:          'Your estate readiness score: {{score}}/100',
    toolH1:               'Your estate readiness report',
    toolIntro:            "Hi {{name}}, here's your full breakdown.",
    toolBandExcellent:    'Excellent',
    toolBandGood:         'Good progress',
    toolBandStart:        'A good start',
    toolBandAttention:    'Needs attention',
    toolScoreLabel:       'Your score',
    toolBreakdown:        'Section breakdown',
    toolQWill:            'Up-to-date will',
    toolQAccounts:        'Documented accounts & assets',
    toolQLpa:             'Lasting Power of Attorney',
    toolQTrusted:         'Trusted contacts designated',
    toolQWishes:          'Final wishes recorded in writing',
    toolQFallback:        'Question {{n}}',
    toolItemFallback:     'Item',
    toolFocus:            'What to focus on next',
    toolNotInPlace:       'not yet in place',
    toolPartial:          'partially complete',
    toolPerfect:          '🎉 Your plan is in excellent shape. Well done.',
    toolOutro:            'Everstead is where you put all of this in one secure place, your accounts, documents, trusted people, and final wishes.',
    toolCta:              'Start your free plan →',

    // information request (to a report submitter)
    infoSubject:          'Information requested regarding your Everstead report',
    infoH1:               'Additional information required',
    infoGreeting:         'Hi {{name}},',
    infoBodyNamed:        'We are reviewing the report you submitted regarding <strong>{{owner}}</strong> and need a little more information before we can proceed.',
    infoBodyAnon:         'We are reviewing the report you submitted and need a little more information before we can proceed.',
    infoBody2:            'Please reply directly to this email with the requested information and we will continue processing your report as quickly as possible.',

    // admin sending a user a direct message (greeting only, body is verbatim)
    directGreeting:       'Hi {{name}},',
  },
  fr: {
    // shared
    someone:              'Quelqu\'un',
    there:                'à vous',
    questions:            'Une question ?',
    needHelp:             'Besoin d\'aide ?',

    // welcome
    welcomeSubject:       'Bienvenue chez Everstead',
    welcomeH1:            'Bienvenue, {{name}}',
    welcomeIntroFree:     'Merci d\'avoir rejoint Everstead. Vous êtes sur le forfait <strong>{{plan}}</strong>, gratuit à vie et sans carte bancaire.',
    welcomeIntroTrial:    'Merci d\'avoir rejoint Everstead. Vous êtes sur le forfait <strong>{{plan}}</strong>, votre essai gratuit de 14 jours commence maintenant.',
    welcomeBody1:         'Everstead vous aide à réunir tout ce que vos proches doivent savoir (comptes, documents, contacts et consignes) en un seul endroit sécurisé et privé.',
    welcomeBody2:         'Commencez par ajouter un premier compte ou déposer un document important.',
    welcomeCta:           'Accéder à mon tableau de bord →',

    // invite accepted (to the vault owner)
    acceptedSubject:      '{{name}} a accepté votre invitation',
    acceptedContactCap:   'Votre contact',
    acceptedContact:      'votre contact',
    acceptedH1:           '{{name}} a accepté votre invitation',
    acceptedBody:         'Bonjour {{owner}}, <strong>{{invitee}}</strong>{{role}} a accepté votre invitation Everstead et peut désormais consulter les sections de votre plan de succession que vous lui avez ouvertes.',
    acceptedBody2:        'Vous pouvez revoir et modifier ses autorisations d\'accès depuis votre tableau de bord à tout moment.',
    acceptedCta:          'Voir mon tableau de bord →',

    // trusted person invite
    inviteSubject:        '{{name}} vous invite sur son plan Everstead',
    inviteH1Named:        'Vous êtes invité au plan de succession de <strong>{{name}}</strong>',
    inviteH1Anon:         'Vous êtes invité à un plan de succession',
    inviteGreetingNamed:  'Bonjour {{name}},',
    inviteGreetingAnon:   'Bonjour,',
    inviteRoleFallback:   'personne de confiance',
    inviteBody:           '<strong>{{owner}}</strong> vous a désigné comme <strong>{{role}}</strong> sur Everstead, un plan de succession numérique sécurisé qui garde ses volontés et ses informations importantes organisées et accessibles le moment venu.',
    inviteBody2:          'Créez votre compte gratuit pour accepter l\'invitation et consulter les sections auxquelles vous avez accès.',
    inviteCta:            'Accepter l\'invitation →',
    inviteIgnore:         'Si vous n\'attendiez pas cette invitation, vous pouvez simplement ignorer cet e-mail.',

    // estate readiness report
    toolSubject:          'Votre score de préparation successorale : {{score}}/100',
    toolH1:               'Votre bilan de préparation successorale',
    toolIntro:            'Bonjour {{name}}, voici votre bilan détaillé.',
    toolBandExcellent:    'Excellent',
    toolBandGood:         'Bonne progression',
    toolBandStart:        'Un bon début',
    toolBandAttention:    'À reprendre',
    toolScoreLabel:       'Votre score',
    toolBreakdown:        'Détail par section',
    toolQWill:            'Testament à jour',
    toolQAccounts:        'Comptes et biens répertoriés',
    toolQLpa:             'Mandat de protection future',
    toolQTrusted:         'Personnes de confiance désignées',
    toolQWishes:          'Dernières volontés consignées par écrit',
    toolQFallback:        'Question {{n}}',
    toolItemFallback:     'Élément',
    toolFocus:            'Ce sur quoi avancer ensuite',
    toolNotInPlace:       'pas encore en place',
    toolPartial:          'partiellement fait',
    toolPerfect:          '🎉 Votre plan est en excellent état. Bravo.',
    toolOutro:            'Everstead réunit tout cela en un seul endroit sécurisé, vos comptes, vos documents, vos personnes de confiance et vos dernières volontés.',
    toolCta:              'Ouvrir mon forfait gratuit →',

    // information request (to a report submitter)
    infoSubject:          'Informations complémentaires concernant votre signalement Everstead',
    infoH1:               'Informations complémentaires nécessaires',
    infoGreeting:         'Bonjour {{name}},',
    infoBodyNamed:        'Nous examinons le signalement que vous avez transmis au sujet de <strong>{{owner}}</strong> et avons besoin de quelques précisions avant de pouvoir avancer.',
    infoBodyAnon:         'Nous examinons le signalement que vous avez transmis et avons besoin de quelques précisions avant de pouvoir avancer.',
    infoBody2:            'Merci de répondre directement à cet e-mail avec les informations demandées, nous poursuivrons alors le traitement de votre signalement dans les meilleurs délais.',

    // admin sending a user a direct message (greeting only, body is verbatim)
    directGreeting:       'Bonjour {{name}},',
  },
}

function welcomeHtml(name, plan, lang) {
  const t = translator(COPY, lang)
  const isFree    = plan === 'free'
  name = esc(name); const planName = esc(planLabel(plan))
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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${t('welcomeH1', { name: name || t('there') })}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">${isFree ? t('welcomeIntroFree', { plan: planName }) : t('welcomeIntroTrial', { plan: planName })}</p>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">${t('welcomeBody1')}</p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">${t('welcomeBody2')}</p>
          <a href="${process.env.VITE_APP_URL}/dashboard" style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">${t('welcomeCta')}</a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">${t('needHelp')} <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function inviteAcceptedHtml(ownerName, inviteeName, role, lang) {
  const t = translator(COPY, lang)
  ownerName = esc(ownerName); inviteeName = esc(inviteeName); role = esc(role)
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:32px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${t('acceptedH1', { name: inviteeName || t('acceptedContactCap') })}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">${t('acceptedBody', {
            owner:   ownerName || t('there'),
            invitee: inviteeName || t('acceptedContact'),
            role:    role ? ` (${role})` : '',
          })}</p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">${t('acceptedBody2')}</p>
          <a href="${process.env.VITE_APP_URL}/dashboard" style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">${t('acceptedCta')}</a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">${t('questions')} <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Everstead admin team invite: an internal notification, English only.
function adminInviteHtml(email, inviteUrl) {
  email = esc(email)   // inviteUrl is server-generated (safe); email is user-supplied
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1628;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1628;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#141f38;border:1px solid #1e2d4a;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:28px 40px;text-align:center;border-bottom:1px solid #1e2d4a;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:44px 40px 36px;">
          <p style="margin:0 0 8px;color:#4c7d47;font-size:12px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;">Admin access</p>
          <h1 style="margin:0 0 20px;color:#ffffff;font-size:26px;font-weight:normal;line-height:1.3;">You've been invited to the Everstead admin team</h1>
          <p style="margin:0 0 20px;color:#8a9ab5;font-size:15px;line-height:1.7;">Hi ${email},<br><br>You've been granted admin access to the Everstead internal panel. Click below to set up your account, the link is unique to you and expires after use.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);border-radius:9999px;">
              <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;">Set up admin account →</a>
            </td></tr>
          </table>
          <p style="margin:0;color:#4a5568;font-size:13px;line-height:1.6;">If you weren't expecting this, ignore this email, no account will be created without clicking the link above.</p>
        </td></tr>
        <tr><td style="padding:24px 40px 32px;border-top:1px solid #1e2d4a;">
          <p style="margin:0;color:#4a5568;font-size:12px;"><a href="mailto:hello@everstead.care" style="color:#4c7d47;text-decoration:none;">hello@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function inviteHtml(inviteeName, ownerName, role, inviteToken, lang) {
  const t = translator(COPY, lang)
  inviteeName = esc(inviteeName); ownerName = esc(ownerName); role = esc(role)
  const signupUrl = inviteToken
    ? `${process.env.VITE_APP_URL}/accept-invite?token=${inviteToken}`
    : `${process.env.VITE_APP_URL}/accept-invite`
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:28px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:44px 40px 36px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:26px;font-weight:normal;line-height:1.3;">
            ${ownerName ? t('inviteH1Named', { name: ownerName }) : t('inviteH1Anon')}
          </h1>
          <p style="margin:0 0 20px;color:#5a6475;font-size:15px;line-height:1.7;">
            ${inviteeName ? t('inviteGreetingNamed', { name: inviteeName }) : t('inviteGreetingAnon')}<br><br>
            ${t('inviteBody', { owner: ownerName || t('someone'), role: role || t('inviteRoleFallback') })}
          </p>
          <p style="margin:0 0 32px;color:#5a6475;font-size:15px;line-height:1.7;">${t('inviteBody2')}</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);border-radius:9999px;">
              <a href="${signupUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;">${t('inviteCta')}</a>
            </td></tr>
          </table>
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">${t('inviteIgnore')}</p>
        </td></tr>
        <tr><td style="padding:24px 40px 32px;border-top:1px solid #ede9e3;">
          <p style="margin:0;color:#b0b8c1;font-size:12px;"><a href="mailto:support@everstead.care" style="color:#4c7d47;text-decoration:none;">support@everstead.care</a></p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;color:#c4bfb8;font-size:11px;text-align:center;">Everstead · everstead.care</p>
    </td></tr>
  </table>
</body>
</html>`
}

function toolReportHtml(name, score, answers, lang) {
  const t = translator(COPY, lang)
  const firstName = esc(name?.split(' ')[0] || t('there'))
  const appUrl    = process.env.VITE_APP_URL || 'https://www.everstead.care'

  const band = score >= 86 ? { label: t('toolBandExcellent'), color: '#0d1628' }
             : score >= 61 ? { label: t('toolBandGood'),      color: '#4c7d47' }
             : score >= 31 ? { label: t('toolBandStart'),     color: '#d97706' }
             :                { label: t('toolBandAttention'), color: '#dc2626' }

  const QUESTIONS = [
    { id: 'will',     key: 'toolQWill' },
    { id: 'accounts', key: 'toolQAccounts' },
    { id: 'lpa',      key: 'toolQLpa' },
    { id: 'trusted',  key: 'toolQTrusted' },
    { id: 'wishes',   key: 'toolQWishes' },
  ]

  const rows = (answers || []).map((a, i) => {
    const q   = QUESTIONS[i] || {}
    const pts = typeof a?.points === 'number' ? a.points : 0
    const col = pts === 20 ? '#4c7d47' : pts > 0 ? '#d97706' : '#dc2626'
    return `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0ede8;font-size:14px;color:#374151;">${q.key ? t(q.key) : t('toolQFallback', { n: i + 1 })}</td>
      <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0ede8;text-align:right;font-size:14px;font-weight:600;color:${col};">${pts}/20</td>
    </tr>`
  }).join('')

  const missing = (answers || [])
    .map((a, i) => ({ q: QUESTIONS[i], pts: typeof a?.points === 'number' ? a.points : 0 }))
    .filter(x => x.pts < 20)
    .map(x => `<li style="margin:0 0 8px;font-size:14px;color:#4a5568;line-height:1.5;">${x.pts === 0 ? '❌' : '⚠️'} ${x.q?.key ? t(x.q.key) : t('toolItemFallback')}, ${x.pts === 0 ? t('toolNotInPlace') : t('toolPartial')}</li>`)
    .join('')

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
          <h1 style="margin:0 0 8px;color:#0d1628;font-size:24px;font-weight:normal;">${t('toolH1')}</h1>
          <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">${t('toolIntro', { name: firstName })}</p>
          <div style="background:#f9f8f6;border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;">${t('toolScoreLabel')}</p>
            <p style="margin:0;font-size:56px;font-weight:300;color:${band.color};line-height:1.1;">${score}<span style="font-size:24px;">/100</span></p>
            <p style="margin:8px 0 0;font-size:16px;color:${band.color};font-weight:600;">${band.label}</p>
          </div>
          <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#0d1628;">${t('toolBreakdown')}</h2>
          <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
          ${missing ? `
          <div style="margin:28px 0 0;background:#fff7ed;border-radius:10px;padding:20px 24px;">
            <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#92400e;">${t('toolFocus')}</h3>
            <ul style="margin:0;padding:0;list-style:none;">${missing}</ul>
          </div>` : `
          <div style="margin:28px 0 0;background:#f0fdf4;border-radius:10px;padding:20px 24px;">
            <p style="margin:0;font-size:15px;color:#14532d;">${t('toolPerfect')}</p>
          </div>`}
          <div style="margin:32px 0 0;text-align:center;">
            <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;">${t('toolOutro')}</p>
            <a href="${appUrl}/get-started" style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">${t('toolCta')}</a>
          </div>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">${t('questions')} <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function infoRequestHtml(reporterName, ownerName, message, lang) {
  const t = translator(COPY, lang)
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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:22px;font-weight:normal;">${t('infoH1')}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.7;">${t('infoGreeting', { name: esc(reporterName) || t('there') })}</p>
          <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.7;">
            ${ownerName ? t('infoBodyNamed', { owner: esc(ownerName) }) : t('infoBodyAnon')}
          </p>
          <div style="background:#f5f4f0;border-left:3px solid #4c7d47;border-radius:4px;padding:16px 20px;margin:24px 0;">
            <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;white-space:pre-wrap;">${esc(message)}</p>
          </div>
          <p style="margin:0 0 0;color:#4a5568;font-size:15px;line-height:1.7;">
            ${t('infoBody2')}
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">Everstead · <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function adminDirectHtml(toName, subject, message, lang) {
  const t = translator(COPY, lang)
  const escaped = message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
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
          <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.7;">${t('directGreeting', { name: toName || t('there') })}</p>
          <div style="color:#374151;font-size:15px;line-height:1.8;">${escaped}</div>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">Everstead · <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Founder notification (julien@everstead.care): internal, English only.
function ownerRegistrationHtml({ name, email, plan, billingCycle }) {
  name = esc(name); email = esc(email); plan = esc(plan); billingCycle = esc(billingCycle)
  const signedUpAt = new Date().toLocaleString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  })
  const row = (label, value) => value
    ? `<tr>
        <td style="padding:10px 0;color:#6b7280;font-size:14px;border-bottom:1px solid #f0ede8;width:140px;">${label}</td>
        <td style="padding:10px 0;color:#0d1628;font-size:14px;border-bottom:1px solid #f0ede8;font-weight:500;">${value}</td>
      </tr>`
    : ''
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:28px 40px;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="140" style="display:block;height:auto;" />
        </td></tr>
        <tr><td style="padding:36px 40px 28px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#4c7d47;">New registration</p>
          <h1 style="margin:0 0 6px;color:#0d1628;font-size:22px;font-weight:normal;">
            ${name || email} just created an account
          </h1>
          <p style="margin:0 0 24px;color:#9ca3af;font-size:13px;">Card not yet entered, awaiting Stripe checkout</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${row('Name', name || '—')}
            ${row('Email', `<a href="mailto:${email}" style="color:#4c7d47;">${email}</a>`)}
            ${row('Plan selected', plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : '—')}
            ${row('Billing', billingCycle ? billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1) : '—')}
            ${row('Registered', signedUpAt)}
          </table>
          <div style="margin-top:28px;">
            <a href="${process.env.VITE_APP_URL}/admin" style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-size:14px;">View in admin panel →</a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Everstead · automated owner notification · a follow-up email will arrive when they complete Stripe checkout</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
