import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || process.env.APP_URL || 'https://www.everstead.care'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Allowed sources — any value outside this set is rejected.
// Each maps to a render function that produces the takeaway email.
const SOURCES = {
  'executor-checklist':              { subject: 'Your executor checklist',                                            render: executorChecklistHtml },
  'digital-estate-calculator':       { subject: 'Your digital estate estimate', subjectFr: 'Votre estimation de patrimoine', render: digitalEstateHtml },
  'when-someone-dies':               { subject: 'What to do when someone dies, your full guide',                     render: whenSomeoneDiesHtml    },
  'adviser-inheritance-conversations': { subject: "The Adviser's Guide to Inheritance Conversations",                  render: inheritanceConversationsHtml },
  'adviser-pre-bereavement-checklist': { subject: 'Pre-bereavement client checklist (template)',                       render: preBereavementChecklistHtml },
  'adviser-positioning-playbook':      { subject: 'Estate organisation as a value-add: pricing & positioning playbook', render: positioningPlaybookHtml },
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, name, source, metadata } = req.body || {}
  // Interface language the tool was used in; only the calculator has a French edition.
  const lang = req.body?.lang === 'fr' ? 'fr' : 'en'

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }
  if (!source || !SOURCES[source]) {
    return res.status(400).json({ error: 'Unknown source' })
  }

  const normalised = email.trim().toLowerCase()
  const cleanName  = (name || '').toString().trim().slice(0, 80) || null
  const sourceIp   =
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req.headers['x-real-ip']?.toString() || null
  const userAgent  = req.headers['user-agent']?.toString().slice(0, 500) || null

  // Upsert by (email, source). If they previously unsubscribed from this source,
  // re-subscribe them since they're actively opting in again.
  let unsubscribeToken
  try {
    const { data: existing, error: lookupErr } = await supabase
      .from('marketing_leads')
      .select('id, unsubscribe_token, unsubscribed_at')
      .ilike('email', normalised)
      .eq('source', source)
      .maybeSingle()

    if (lookupErr && lookupErr.code !== 'PGRST116') {
      console.error('[leads/capture] lookup error:', lookupErr)
    }

    if (existing) {
      unsubscribeToken = existing.unsubscribe_token
      const { error: updateErr } = await supabase
        .from('marketing_leads')
        .update({
          name: cleanName,
          source_metadata: metadata || null,
          unsubscribed_at: null,
          subscribed_at: new Date().toISOString(),
          source_ip: sourceIp,
          user_agent: userAgent,
        })
        .eq('id', existing.id)
      if (updateErr) console.error('[leads/capture] update error:', updateErr)
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('marketing_leads')
        .insert({
          email: normalised,
          name: cleanName,
          source,
          source_metadata: metadata || null,
          source_ip: sourceIp,
          user_agent: userAgent,
        })
        .select('unsubscribe_token')
        .single()
      if (insertErr) {
        console.error('[leads/capture] insert error:', insertErr)
      } else {
        unsubscribeToken = inserted.unsubscribe_token
      }
    }
  } catch (err) {
    console.error('[leads/capture] DB exception:', err)
    captureException(err, { endpoint: 'leads/capture', stage: 'db-write' })
    // Don't block the email send if DB write fails — better to deliver the
    // takeaway than to leave the user empty-handed. We'll fall through.
  }

  // Send the tool-specific takeaway email (best-effort — log failures)
  try {
    const { subject, subjectFr, render } = SOURCES[source]
    const unsubLink = unsubscribeToken
      ? `${APP_URL}/api/leads/unsubscribe?token=${unsubscribeToken}`
      : `${APP_URL}/api/leads/unsubscribe`
    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      normalised,
      subject: lang === 'fr' && subjectFr ? subjectFr : subject,
      html:    render({ name: cleanName, metadata: metadata || {}, unsubLink, lang }),
    })
  } catch (err) {
    console.error('[leads/capture] email send error:', err)
    captureException(err, { endpoint: 'leads/capture', stage: 'email-send' })
    return res.status(500).json({ error: "Could not send the email. Please try again or contact hello@everstead.care." })
  }

  return res.status(200).json({ ok: true })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Email templates
// ─────────────────────────────────────────────────────────────────────────────

function shell({ heading, body, footerNote, unsubLink, lang = 'en' }) {
  const fr = lang === 'fr'
  const pitch  = fr
    ? "Everstead réunit vos comptes, vos documents, vos personnes de confiance et vos volontés en un seul endroit sécurisé, pour que ceux que vous aimez sachent exactement quoi faire, le jour où cela compte."
    : 'Everstead is where you put your accounts, documents, trusted people, and final wishes in one secure place, so the people you love know exactly what to do, when it counts.'
  const ctaHref  = fr ? `${APP_URL}/fr/get-started` : `${APP_URL}/get-started`
  const ctaLabel = fr ? 'Commencer gratuitement →' : 'Start your free plan →'
  const ctaNote  = fr ? 'Offre gratuite · Sans carte bancaire' : 'Free plan · No card needed'
  const defaultFooter = fr ? "Vous avez demandé cet envoi depuis un outil gratuit sur everstead.care." : 'You requested this from a free tool on everstead.care.'
  const unsubLabel = fr ? 'Se désinscrire de cette liste' : 'Unsubscribe from this list'
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:28px 40px;text-align:center;">
          <img src="${APP_URL}/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 20px;color:#0d1628;font-size:26px;font-weight:normal;line-height:1.3;">${heading}</h1>
          ${body}
          <div style="margin:36px 0 0;text-align:center;border-top:1px solid #e8e5e0;padding-top:28px;">
            <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;">${pitch}</p>
            <a href="${ctaHref}" style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">${ctaLabel}</a>
            <p style="margin:14px 0 0;color:#9ca3af;font-size:13px;">${ctaNote}</p>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#f9f8f6;border-top:1px solid #e8e5e0;">
          <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;line-height:1.5;">${footerNote || defaultFooter}</p>
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;"><a href="${unsubLink}" style="color:#6b7280;">${unsubLabel}</a> · Everstead Digital Ltd · ${fr ? 'Royaume-Uni' : 'UK'}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function executorChecklistHtml({ name, unsubLink }) {
  const firstName = name?.split(' ')[0] || 'there'
  const sections = [
    { title: '1. In the first 24-48 hours', items: [
      'Obtain the medical certificate of cause of death from the GP or hospital',
      'Register the death within 5 days (8 in Scotland) at the register office',
      'Get extra certified copies of the death certificate, you will need many',
      'Notify immediate family and close friends',
      'Secure the deceased\'s home, vehicle, and pets',
    ]},
    { title: '2. In the first 2 weeks', items: [
      'Locate the will, check home, solicitor, bank deposit box',
      'Make funeral arrangements (within the bounds of the will\'s wishes)',
      'Use the Tell Us Once service to notify HMRC, DWP, DVLA, and councils',
      'Notify employer, pension provider, and life insurance company',
      'Contact banks and building societies, accounts will be frozen',
    ]},
    { title: '3. Within the first month', items: [
      'Apply for probate (or letters of administration if no will)',
      'Make a complete inventory of assets and debts (the "estate accounts")',
      'Notify utility companies, council tax, broadband, mobile providers',
      'Cancel subscriptions, memberships, and recurring direct debits',
      'Notify insurers, home, car, life, health',
    ]},
    { title: '4. Within 3-6 months', items: [
      'Submit the IHT400 form to HMRC if inheritance tax is due',
      'Pay any inheritance tax owed (due 6 months after the end of the month of death)',
      'Receive the grant of probate, typically 8-16 weeks after applying',
      'Distribute specific gifts named in the will',
      'Close accounts and consolidate assets into the executor\'s estate account',
    ]},
    { title: '5. Final steps', items: [
      'Place a Section 27 Trustee Act notice to protect against unknown creditors',
      'Settle final tax returns for the deceased\'s last year',
      'Prepare and circulate the estate accounts to beneficiaries',
      'Distribute the residual estate as directed by the will',
      'Keep records for at least 12 years',
    ]},
  ]

  const body = `
    <p style="margin:0 0 20px;color:#4a5568;font-size:15px;line-height:1.7;">Hi ${firstName}, here's the executor's checklist you requested, the practical, UK-specific steps to handle an estate from day one through final distribution. Save this email, or print it.</p>

    <div style="background:#fff7ed;border-left:3px solid #d97706;border-radius:6px;padding:14px 18px;margin:0 0 28px;">
      <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;"><strong>A note:</strong> this is a guide, not legal advice. For estates with complex tax positions, property in multiple jurisdictions, or disputed wills, instruct a probate solicitor.</p>
    </div>

    ${sections.map(s => `
      <h2 style="margin:24px 0 12px;color:#0d1628;font-size:17px;font-weight:600;">${s.title}</h2>
      <ul style="margin:0 0 8px;padding:0 0 0 20px;color:#374151;font-size:14px;line-height:1.8;">
        ${s.items.map(i => `<li style="margin:0 0 6px;">${i}</li>`).join('')}
      </ul>
    `).join('')}
  `

  return shell({
    heading: 'Your executor checklist',
    body,
    footerNote: 'You requested the executor checklist from everstead.care/executor-checklist.',
    unsubLink,
  })
}

function digitalEstateHtml({ name, metadata, unsubLink, lang = 'en' }) {
  const fr        = lang === 'fr'
  const firstName = name?.split(' ')[0] || (fr ? '' : 'there')
  const total     = metadata?.total ?? null
  const breakdown = Array.isArray(metadata?.breakdown) ? metadata.breakdown : []
  const currency  = metadata?.currency === 'EUR' ? 'EUR' : 'GBP'

  const formatted = total != null
    ? new Intl.NumberFormat(currency === 'EUR' ? 'fr-FR' : 'en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(total)
    : null

  const breakdownHtml = breakdown.length > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
         ${breakdown.map(row => `
           <tr>
             <td style="padding:10px 0;border-bottom:1px solid #f0ede8;font-size:14px;color:#374151;">${escapeHtml(row.label || '')}</td>
             <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0ede8;text-align:right;font-size:14px;font-weight:600;color:#0d1628;">${escapeHtml(row.value || '')}</td>
           </tr>
         `).join('')}
       </table>`
    : ''

  const totalCard = formatted
    ? `<div style="background:#f9f8f6;border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
         <p style="margin:0 0 4px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;">${fr ? 'Valeur estimée de votre patrimoine' : 'Estimated digital estate value'}</p>
         <p style="margin:0;font-size:48px;font-weight:300;color:#0d1628;line-height:1.1;">${formatted}</p>
       </div>`
    : ''

  const body = fr ? `
    <p style="margin:0 0 20px;color:#4a5568;font-size:15px;line-height:1.7;">Bonjour${firstName ? ` ${firstName}` : ''}, voici votre estimation de patrimoine.</p>
    ${totalCard}
    ${breakdown.length > 0 ? `<h2 style="margin:0 0 12px;color:#0d1628;font-size:17px;font-weight:600;">Où se trouve la valeur</h2>${breakdownHtml}` : ''}
    <h2 style="margin:24px 0 12px;color:#0d1628;font-size:17px;font-weight:600;">Pourquoi cela compte</h2>
    <p style="margin:0 0 16px;color:#4a5568;font-size:14px;line-height:1.7;">Une vie d'adulte se répartit aujourd'hui entre des dizaines de comptes\u00a0: banques en ligne, assurance-vie, plans d'épargne, portefeuilles de cryptomonnaies, abonnements, espaces de stockage. Après un décès, une grande partie reste introuvable pour les proches, simplement parce que personne ne sait qu'elle existe. La loi Eckert transfère chaque année les comptes oubliés à la Caisse des Dépôts.</p>
    <p style="margin:0 0 16px;color:#4a5568;font-size:14px;line-height:1.7;">Le rôle d'Everstead est simple\u00a0: un endroit structuré pour recenser chaque compte (sans mot de passe, de simples repères), qui y a accès, et ce qu'il doit en advenir. Vos proches héritent d'une carte lisible, pas d'un jeu de devinettes.</p>
  ` : `
    <p style="margin:0 0 20px;color:#4a5568;font-size:15px;line-height:1.7;">Hi ${firstName}, here's your digital estate estimate.</p>
    ${totalCard}
    ${breakdown.length > 0 ? `<h2 style="margin:0 0 12px;color:#0d1628;font-size:17px;font-weight:600;">Where the value sits</h2>${breakdownHtml}` : ''}
    <h2 style="margin:24px 0 12px;color:#0d1628;font-size:17px;font-weight:600;">Why this matters</h2>
    <p style="margin:0 0 16px;color:#4a5568;font-size:14px;line-height:1.7;">A typical UK adult now holds several thousand pounds of value spread across digital accounts, investment platforms, crypto wallets, loyalty points, domain names, cloud storage, monetised social accounts. Most of it is inaccessible to family after death, because no one knows it's there.</p>
    <p style="margin:0 0 16px;color:#4a5568;font-size:14px;line-height:1.7;">Everstead's role is simple: a structured place to record every account (no passwords needed, just references), who has access, and what should happen to it. Your family inherits a usable map, not a guessing game.</p>
  `

  return shell({
    heading: fr ? 'Votre estimation de patrimoine' : 'Your digital estate estimate',
    body,
    footerNote: fr
      ? 'Vous avez demandé cette estimation depuis everstead.care/fr/digital-estate-worth.'
      : 'You requested this estimate from everstead.care/digital-estate-worth.',
    unsubLink,
    lang,
  })
}

function whenSomeoneDiesHtml({ name, unsubLink }) {
  const firstName = name?.split(' ')[0] || 'there'
  const phases = [
    { title: 'Phase 1: The first few hours', text: 'If the death was expected and at home, call the GP. If unexpected or at night, call 111. The GP issues the Medical Certificate of Cause of Death (MCCD). You cannot register the death without it. Tell close family before social media gets there first.' },
    { title: 'Phase 2: Within 5 days', text: 'Register the death at the register office (8 days in Scotland). Take the MCCD plus the deceased\'s NHS number, full name, date and place of birth, address, and occupation. You\'ll get the death certificate and the green form for the funeral director, buy 6-10 certified copies, you\'ll need them.' },
    { title: 'Phase 3 (Tell organisations', text: 'Use Tell Us Once (gov.uk/tell-us-once)) it notifies HMRC, DWP, DVLA, Passport Office, and your local council in one go. Separately tell: banks, employer/pension provider, life insurer, utility companies, broadband and mobile, GP surgery, dentist, council tax, and TV licence.' },
    { title: 'Phase 4: The funeral', text: 'You don\'t have to use a funeral director (though most people do). Check the will for funeral wishes. Funeral costs can usually be paid out of the deceased\'s frozen bank account before probate. Ask the bank for the funeral payment form.' },
    { title: 'Phase 5: Probate', text: 'Find the will (home, solicitor, bank). Apply for probate (gov.uk/applying-for-probate), typically 8-16 weeks. If no will, apply for letters of administration. For estates over £325,000 (£500,000 with main residence to a direct descendant), file the IHT400 form.' },
    { title: 'Phase 6: Settling the estate', text: 'Make a complete list of assets and debts. Open an executor\'s account. Pay debts and inheritance tax. Place a Section 27 Trustee Act notice to protect yourself from unknown creditors. Distribute the estate as the will directs. Prepare estate accounts for beneficiaries.' },
    { title: 'Phase 7: After', text: 'Keep records for 12 years. Cancel any remaining subscriptions, social media accounts (Facebook memorialisation, Google inactive account manager). Update household admin if the deceased was the primary bill-payer. Give yourself permission to grieve.' },
  ]

  const body = `
    <p style="margin:0 0 20px;color:#4a5568;font-size:15px;line-height:1.7;">Hi ${firstName}, when someone close to you dies, the practical steps come at you fast, often while you\'re trying to process the news. This is a sequenced guide so you don\'t have to think.</p>

    <div style="background:#f0fdf4;border-left:3px solid #4c7d47;border-radius:6px;padding:14px 18px;margin:0 0 28px;">
      <p style="margin:0;color:#14532d;font-size:13px;line-height:1.6;"><strong>Bereavement support:</strong> Cruse Bereavement Care, 0808 808 1677 (free, UK). Samaritans, 116 123 (any time, free). You don\'t have to do this alone.</p>
    </div>

    ${phases.map(p => `
      <h2 style="margin:24px 0 10px;color:#0d1628;font-size:17px;font-weight:600;">${p.title}</h2>
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.7;">${p.text}</p>
    `).join('')}

    <div style="background:#fef3c7;border-left:3px solid #d97706;border-radius:6px;padding:14px 18px;margin:24px 0 0;">
      <p style="margin:0;color:#78350f;font-size:13px;line-height:1.6;"><strong>This is a guide, not legal advice.</strong> For estates with complex tax, property abroad, contested wills, or trusts, instruct a probate solicitor early. STEP UK has a member directory at step.org.</p>
    </div>
  `

  return shell({
    heading: 'What to do when someone dies, your full guide',
    body,
    footerNote: 'You requested this guide from everstead.care/what-to-do-when-someone-dies.',
    unsubLink,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Adviser lead-magnet templates
// ─────────────────────────────────────────────────────────────────────────────

function adviserShell({ heading, body, footerNote, unsubLink }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:640px;width:100%;">
        <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:28px 40px;text-align:center;">
          <img src="${APP_URL}/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
          <p style="margin:14px 0 0;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.15em;">For advisers</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 24px;color:#0d1628;font-size:26px;font-weight:normal;line-height:1.3;">${heading}</h1>
          ${body}
          <div style="margin:40px 0 0;background:#f9f8f6;border-radius:12px;padding:24px;border-left:3px solid #4c7d47;">
            <p style="margin:0 0 8px;color:#4c7d47;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">About Everstead for advisers</p>
            <p style="margin:0 0 14px;color:#4a5568;font-size:14px;line-height:1.7;">A co-branded client vault that turns estate organisation into a structured service offering. Multi-client workspace, readiness tracking, and a portal your clients open between meetings. We're working personally with our first adviser firms, early access.</p>
            <a href="${APP_URL}/book-demo" style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-size:14px;">Book a 20-minute call →</a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#f9f8f6;border-top:1px solid #e8e5e0;">
          <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;line-height:1.5;">${footerNote || 'You requested this from everstead.care/for-advisers.'}</p>
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;"><a href="${unsubLink}" style="color:#6b7280;">Unsubscribe from this list</a> · Everstead Digital Ltd · UK</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function inheritanceConversationsHtml({ name, unsubLink }) {
  const firstName = name?.split(' ')[0] || 'there'
  const sections = [
    { title: '1. Open with permission, not assumptions', body: 'Most clients haven\'t been asked to talk about death by a professional. Frame the conversation as part of holistic planning, not a sales motion. A line that works: <em>"We tend to cover the harder topics (health, capacity, what happens to the family if something changes) once a year. Are you OK if we touch on that today?"</em> Most people say yes; some defer; a few say no. All three responses are useful data.' },
    { title: '2. Separate the legal from the practical', body: 'Clients often conflate "I have a will" with "I\'m organised". Make the distinction early. A will tells the court what happens to assets. Practical estate organisation tells the family <em>where everything is, who to call, and what to do first</em>. Most families have one and not the other. Surface that gap explicitly, it\'s where you add the most value.' },
    { title: '3. Lead with the spouse, not the estate', body: 'Inheritance is abstract. The bereaved spouse is concrete. "If something happened to you next month, would Sarah know how to access your SIPP, which broker holds the GIA, where the home insurance documents are, and which bank account the mortgage comes from?" Almost always: no. That conversation does the selling.' },
    { title: '4. Use the round-number question', body: 'Ask: <em>"If you had to die tomorrow with everything in order, what\'s the one thing you\'d most regret leaving undone?"</em> This bypasses the discomfort of mortality and goes straight to action. The answers are remarkable, and they almost always sit in the practical/organisational layer, not the legal one.' },
    { title: '5. Make it about the children (when there are children)', body: 'For clients with adult children: "When you go (at whatever age) your kids will inherit the admin of your life. Right now, what does that look like?" For clients with younger children: pivot to LPAs, guardianship, and the practical operations of the household. Both versions land harder than abstract IHT planning.' },
    { title: '6. Don\'t solve it in the meeting, schedule it', body: 'A 15-minute inheritance conversation usually generates a 90-minute follow-up. Don\'t try to compress. Open the conversation, identify the gap, and book a dedicated session. Position that session as part of your service, not a separate add-on. The clients who book it are your most engaged ones.' },
    { title: '7. Give them an action they can do this week', body: 'Closing without an action item is closing without commitment. Ideas: complete an estate readiness questionnaire, list trusted contacts, write a one-page "if you need to find everything" memo for their spouse. Small, completable, and a great segue into a structured tool (which is the role Everstead plays).' },
  ]

  const body = `
    <p style="margin:0 0 22px;color:#4a5568;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 22px;color:#4a5568;font-size:15px;line-height:1.7;">Inheritance is the conversation most advisers know they should have, structure into their annual review, and never quite get around to having. The friction isn\'t the topic, it\'s the entry point. Once a client is in the conversation, they almost always want more of it; the hard part is opening it well.</p>
    <p style="margin:0 0 26px;color:#4a5568;font-size:15px;line-height:1.7;">Seven framings we\'ve seen work, drawn from conversations with IFAs, estate solicitors, and private client teams. Use what fits your style.</p>

    ${sections.map(s => `
      <h2 style="margin:24px 0 10px;color:#0d1628;font-size:17px;font-weight:600;">${s.title}</h2>
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">${s.body}</p>
    `).join('')}

    <h2 style="margin:30px 0 10px;color:#0d1628;font-size:17px;font-weight:600;">A practical close</h2>
    <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">After the conversation, the bottleneck shifts from "willing to talk" to "actually doing it". This is where most adviser-led estate work dies, clients agree it matters, then disappear into life. A structured tool (an Everstead vault, a questionnaire, a checklist) that they can <em>actually open and complete between meetings</em> changes the completion rate dramatically. That\'s the role we play in adviser-led practices.</p>
    <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">Happy to talk through how we operationalise this for our pilot adviser firms, book a 20-minute call below.</p>
  `

  return adviserShell({
    heading: "The Adviser's Guide to Inheritance Conversations",
    body,
    footerNote: 'You requested this guide from everstead.care/for-advisers.',
    unsubLink,
  })
}

function preBereavementChecklistHtml({ name, unsubLink }) {
  const firstName = name?.split(' ')[0] || 'there'
  const sections = [
    { title: 'A. Identity, capacity, and authority', items: [
      'Up-to-date will, original location confirmed (solicitor, home safe, bank)',
      'Lasting Power of Attorney (Health & Welfare), registered with the OPG',
      'Lasting Power of Attorney (Property & Financial), registered with the OPG',
      'Trusted contact named for the firm, and consented to the relationship',
      'Healthcare directives / advance decisions documented (if applicable)',
    ]},
    { title: 'B. Financial inventory', items: [
      'Bank accounts (current, savings, ISAs), provider, account number reference, sole vs joint',
      'Investment platforms (GIA, ISA, SIPP), provider and broker contact',
      'Pensions, workplace, personal, DB scheme references, death benefit nominations updated',
      'Life insurance, policy reference and beneficiary',
      'Property, title deeds, mortgage holder, key locations',
      'Crypto and digital assets, wallet existence noted (not keys)',
      'Outstanding debts and loans',
    ]},
    { title: 'C. Documents the family will need', items: [
      'Birth certificate, marriage certificate, decree absolute (if applicable)',
      'Passport, driving licence, NHS number',
      'Will, original copy and copy in vault',
      'LPAs, registered copies',
      'Insurance policies (home, car, life, health)',
      'Funeral plan or wishes document',
      'Recent tax returns and accountant contact',
    ]},
    { title: 'D. The "find everything" map', items: [
      'Spouse / next of kin briefed on where the will and LPAs are',
      'Account inventory shared with a trusted person (Everstead, sealed envelope, or via solicitor)',
      'Password manager has a designated emergency contact',
      'Funeral wishes communicated to next of kin (and ideally documented)',
      'Pet care contingencies documented (if applicable)',
    ]},
    { title: 'E. Relational and emotional preparation', items: [
      'Personal letters / messages to immediate family, written or planned',
      'Difficult conversations had, debts, blended-family considerations, charity bequests',
      'Funeral preferences documented, burial vs cremation, service preferences, music',
      'Memorialisation preferences, social media accounts, online presence',
    ]},
    { title: 'F. Firm-side checklist', items: [
      'Annual review specifically covers estate readiness, not just portfolio',
      'Client file flags: will exists / LPAs registered / nominations current',
      'Pre-bereavement contact protocol in place, who reaches out, when',
      'Post-death client handover process documented (probate referral partners, executor support)',
      'Client family contact details on record (spouse, executor, adult children where appropriate)',
    ]},
  ]

  const body = `
    <p style="margin:0 0 20px;color:#4a5568;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 22px;color:#4a5568;font-size:15px;line-height:1.7;">This is a working template, not a regulatory document, adapt the wording for your firm. The six sections below are designed to be reviewed annually with each client and updated whenever life changes (new property, new pension, marriage, divorce, new grandchild, change of executor).</p>
    <p style="margin:0 0 26px;color:#4a5568;font-size:15px;line-height:1.7;">For each item, the answer should be one of: <strong>in place</strong>, <strong>in progress</strong>, or <strong>action needed</strong>. The point isn\'t completeness, it\'s visibility.</p>

    ${sections.map(s => `
      <h2 style="margin:24px 0 10px;color:#0d1628;font-size:17px;font-weight:600;">${s.title}</h2>
      <ul style="margin:0 0 10px;padding:0 0 0 20px;color:#374151;font-size:14px;line-height:1.8;">
        ${s.items.map(i => `<li style="margin:0 0 6px;">${i}</li>`).join('')}
      </ul>
    `).join('')}

    <div style="margin:32px 0 0;background:#fef3c7;border-left:3px solid #d97706;border-radius:6px;padding:14px 18px;">
      <p style="margin:0;color:#78350f;font-size:13px;line-height:1.6;"><strong>Operational note:</strong> firms that run this checklist annually report meaningfully higher client retention through generational transitions, because the bereaved spouse already knows the adviser, already trusts them, and doesn\'t have to "find someone" in grief. The checklist is a retention asset disguised as a service.</p>
    </div>
  `

  return adviserShell({
    heading: 'Pre-bereavement client checklist (template)',
    body,
    footerNote: 'You requested this checklist from everstead.care/for-advisers.',
    unsubLink,
  })
}

function positioningPlaybookHtml({ name, unsubLink }) {
  const firstName = name?.split(' ')[0] || 'there'
  const body = `
    <p style="margin:0 0 22px;color:#4a5568;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 22px;color:#4a5568;font-size:15px;line-height:1.7;">If you\'re considering offering estate organisation as a structured service alongside your existing practice (to deepen client relationships, differentiate, and inherit the next generation of clients) this is the playbook. It covers the three live decisions: <strong>how to position it</strong>, <strong>how to price it</strong>, and <strong>how to deliver it</strong> without it becoming a time sink.</p>

    <h2 style="margin:30px 0 10px;color:#0d1628;font-size:18px;font-weight:600;">1. The positioning decision</h2>
    <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">There are three credible ways to frame estate organisation in your practice. They\'re not equivalent, they signal different things to the client and price very differently.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border-collapse:collapse;">
      <tr style="background:#f9f8f6;"><td style="padding:10px 14px;border:1px solid #e8e5e0;font-size:13px;font-weight:600;color:#0d1628;width:30%;">Framing</td><td style="padding:10px 14px;border:1px solid #e8e5e0;font-size:13px;font-weight:600;color:#0d1628;">What it signals · how it prices</td></tr>
      <tr><td style="padding:10px 14px;border:1px solid #e8e5e0;font-size:13px;color:#374151;vertical-align:top;"><strong>Included value-add</strong></td><td style="padding:10px 14px;border:1px solid #e8e5e0;font-size:13px;color:#4a5568;">Part of the existing wealth-management fee. Signals: "we go beyond the portfolio." Best for premium fee tiers (>£3k/yr) where margin absorbs the time. Drives retention, not revenue.</td></tr>
      <tr style="background:#f9f8f6;"><td style="padding:10px 14px;border:1px solid #e8e5e0;font-size:13px;color:#374151;vertical-align:top;"><strong>Discrete annual service</strong></td><td style="padding:10px 14px;border:1px solid #e8e5e0;font-size:13px;color:#4a5568;">Separately priced offering, typically £200, £500/yr or £750, £1.5k as a one-time setup with a maintenance fee. Signals: "this is structured work that deserves its own line item." Easiest to scale.</td></tr>
      <tr><td style="padding:10px 14px;border:1px solid #e8e5e0;font-size:13px;color:#374151;vertical-align:top;"><strong>Family-office tier</strong></td><td style="padding:10px 14px;border:1px solid #e8e5e0;font-size:13px;color:#4a5568;">Bundled into a higher service tier with concierge handling, document custody, and named-partner access. Prices into existing tiered fee schedule (£5k+ tier). Powerful for HNW practices.</td></tr>
    </table>
    <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">For most IFA and small private-client practices, framing 2 (discrete annual service) is the right entry point. It\'s clear, it\'s priceable, and it doesn\'t require restructuring the existing fee.</p>

    <h2 style="margin:30px 0 10px;color:#0d1628;font-size:18px;font-weight:600;">2. The pricing decision</h2>
    <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">Three pricing models we\'ve seen work, with rough benchmarks from UK practices already offering this:</p>
    <ul style="margin:0 0 18px;padding:0 0 0 20px;color:#374151;font-size:14px;line-height:1.8;">
      <li style="margin:0 0 6px;"><strong>Setup + maintenance:</strong> £750, £1,500 one-time setup (initial inventory, vault organisation, family briefing) + £150, £300/yr ongoing. Simple to explain, easy to invoice.</li>
      <li style="margin:0 0 6px;"><strong>Flat annual fee:</strong> £300, £500/yr, includes one annual review session and continuous vault access. Works well when included in a "premium" service tier.</li>
      <li style="margin:0 0 6px;"><strong>Per-vault license (firms using Everstead):</strong> Client pays the adviser for the service; the firm pays Everstead a wholesale per-vault fee with adviser margin layered on. Cleanest economics; firm controls pricing.</li>
    </ul>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.8;">A working assumption: clients pay 3-4x what they\'d pay an online consumer tool, because the service involves <em>your</em> time and accountability. £30/yr for a SaaS subscription doesn\'t translate to £30/yr from a private client, it translates to £200-£500/yr from a fee-paying client who values structure and trust.</p>

    <h2 style="margin:30px 0 10px;color:#0d1628;font-size:18px;font-weight:600;">3. The delivery decision</h2>
    <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">The single most common reason this service stalls in adviser practices is that the partner who sold it ends up being the one who chases the client to fill in their accounts. Avoid that by:</p>
    <ul style="margin:0 0 18px;padding:0 0 0 20px;color:#374151;font-size:14px;line-height:1.8;">
      <li style="margin:0 0 6px;"><strong>Structuring it as a 90-minute kick-off + asynchronous completion.</strong> The kick-off covers the inventory, LPAs, and trusted contacts. The client populates the vault between sessions, using a structured tool, not a blank document.</li>
      <li style="margin:0 0 6px;"><strong>Assigning the operational lead to a paraplanner or admin team member.</strong> Partner time is for the conversation; everything after is a paraplanner-level workflow. Otherwise the unit economics never work.</li>
      <li style="margin:0 0 6px;"><strong>Building it into the existing annual review.</strong> Don\'t create a parallel meeting cycle. Add a 20-minute "estate readiness" segment to the existing annual review, with an asynchronous workflow in between.</li>
      <li style="margin:0 0 6px;"><strong>Reporting on it.</strong> Quarterly: how many clients have completed setup. Annually: completion velocity, vault-update activity. Treat it like a service KPI, not a side project.</li>
    </ul>

    <h2 style="margin:30px 0 10px;color:#0d1628;font-size:18px;font-weight:600;">4. The retention math</h2>
    <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">The underrated reason this service matters isn\'t the line-item revenue, it\'s what happens at the generational transition. UK firms losing AUM at death typically lose <strong>70-80%</strong> of assets to the beneficiary\'s preferred adviser (often a different firm). Practices with a pre-bereavement service in place, where the spouse and adult children are already engaged with the firm, retain dramatically more, well above 50% in some cases.</p>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.8;">A £300/yr service that meaningfully raises generational retention pays for itself many times over the lifetime of the relationship. That\'s the underlying economic case.</p>

    <h2 style="margin:30px 0 10px;color:#0d1628;font-size:18px;font-weight:600;">5. The Everstead-specific note</h2>
    <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">Most of the above works without us, what we add is the operational backbone. Co-branded vaults under your firm name, a multi-client dashboard so the paraplanner can see who has and hasn\'t completed setup, role-based access for delegated team members, and a pre-built UK-jurisdiction workflow. We\'re working personally with our first adviser firms. If you\'d like to talk through pricing and rollout for your practice, book a 20-minute call below.</p>
  `

  return adviserShell({
    heading: 'Estate organisation as a value-add: pricing & positioning playbook',
    body,
    footerNote: 'You requested this playbook from everstead.care/for-advisers.',
    unsubLink,
  })
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
