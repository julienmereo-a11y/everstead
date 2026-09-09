import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP = process.env.VITE_APP_URL || 'https://www.everstead.care'
const FROM = 'Everstead <hello@everstead.care>'

const shell = (inner) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:28px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="150" style="display:block;margin:0 auto;height:auto;max-width:150px;" />
        </td></tr>
        <tr><td style="padding:40px;">${inner}</td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">Need help? <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

const button = (href, label) =>
  `<a href="${href}" style="display:inline-block;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#fff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">${label}</a>`

// Invite a brand-new adviser to set a password and access the portal.
export async function sendAdviserInvite({ email, firmName, token }) {
  if (!email || !token) return
  const url = `${APP}/accept-adviser-invite?token=${token}`
  const firm = firmName || 'your firm'
  const inner = `
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">You've been invited to Everstead</h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;"><strong>${firm}</strong> has invited you to their adviser portal on Everstead, where your firm manages its clients' plans in one secure place.</p>
    <p style="margin:0 0 28px;color:#4a5568;font-size:16px;line-height:1.6;">Set your password to activate your account and get started.</p>
    ${button(url, 'Set your password →')}
    <p style="margin:28px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;">This invitation was sent to ${email}. If you weren't expecting it, you can ignore this email.</p>`
  try {
    await resend.emails.send({ from: FROM, to: email, subject: `${firm} invited you to Everstead`, html: shell(inner) })
  } catch (err) {
    console.error('[adviser-email] invite failed:', err?.message)
  }
}

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// A firm invites a client family to create their Everstead plan.
// `lang` follows the ADVISER's own language: a French notaire invites French
// families, and this email is often the family's very first contact with
// Everstead. The signup link points at the matching tree for the same reason.
export async function sendClientInvite({ email, clientName, firmName, firmId, note, lang = 'en' }) {
  if (!email || !firmId) return
  const fr = lang === 'fr'
  const url = `${APP}${fr ? '/fr' : ''}/get-started?adviser=${firmId}`
  const firm = esc(firmName) || (fr ? 'Votre conseiller' : 'Your adviser')
  if (fr) {
    const inner = `
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${firm} vous invite sur Everstead</h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">Bonjour ${esc(clientName) || ''}, <strong>${firm}</strong> utilise Everstead pour aider les familles à réunir en un seul endroit sécurisé tout ce dont leurs proches auraient besoin${'\u00a0'}: comptes, documents, personnes de confiance et dernières volontés.</p>
    ${note ? `<p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;border-left:3px solid #e8e5e0;padding-left:14px;font-style:italic;">&laquo;${'\u00a0'}${esc(note)}${'\u00a0'}&raquo;</p>` : ''}
    <p style="margin:0 0 28px;color:#4a5568;font-size:16px;line-height:1.6;">Créez votre espace ci-dessous. Vous gardez le contrôle total de vos informations, et ne partagez jamais que ce que vous choisissez.</p>
    ${button(url, 'Créer mon espace Everstead →')}
    <p style="margin:28px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;">Cette invitation a été envoyée à ${esc(email)} à la demande de ${firm}. Si vous ne l'attendiez pas, vous pouvez ignorer cet e-mail.</p>`
    try {
      await resend.emails.send({ from: FROM, to: email, subject: `${firmName || 'Votre conseiller'} vous invite sur Everstead`, html: shell(inner) })
    } catch (err) {
      console.error('[adviser-email] client invite failed:', err?.message)
    }
    return
  }
  const inner = `
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${firm} has invited you to Everstead</h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">Hi ${esc(clientName) || 'there'}, <strong>${firm}</strong> uses Everstead to help families keep everything their loved ones would need (accounts, documents, trusted people and final wishes) organised in one secure place.</p>
    ${note ? `<p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;border-left:3px solid #e8e5e0;padding-left:14px;font-style:italic;">&ldquo;${esc(note)}&rdquo;</p>` : ''}
    <p style="margin:0 0 28px;color:#4a5568;font-size:16px;line-height:1.6;">Create your plan below, you stay in full control of your information, and only ever share what you choose.</p>
    ${button(url, 'Set up my Everstead plan →')}
    <p style="margin:28px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;">This invitation was sent to ${esc(email)} at the request of ${firm}. If you weren't expecting it, you can ignore this email.</p>`
  try {
    await resend.emails.send({ from: FROM, to: email, subject: `${firmName || 'Your adviser'} has invited you to Everstead`, html: shell(inner) })
  } catch (err) {
    console.error('[adviser-email] client invite failed:', err?.message)
  }
}

// Tell an EXISTING Everstead account they've been added to a firm's portal.
export async function sendAdviserAddedNotice({ email, firmName }) {
  if (!email) return
  const url = `${APP}/advisor-portal`
  const firm = firmName || 'a firm'
  const inner = `
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">You've been added to ${firm}</h1>
    <p style="margin:0 0 28px;color:#4a5568;font-size:16px;line-height:1.6;">Your Everstead account now has access to <strong>${firm}</strong>'s adviser portal. Sign in with your existing details to manage the firm's clients.</p>
    ${button(url, 'Open the adviser portal →')}`
  try {
    await resend.emails.send({ from: FROM, to: email, subject: `You've been added to ${firm} on Everstead`, html: shell(inner) })
  } catch (err) {
    console.error('[adviser-email] added-notice failed:', err?.message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The firm is told when a linked client's vault is activated after a verified
// death or incapacity report. Sent ONLY when the client ticked
// adviser_client_consents.notify_on_activation. One email per recipient, in
// that recipient's language: a French notaire and an English paralegal at the
// same firm each read their own.
// ─────────────────────────────────────────────────────────────────────────────
const ACTIVATED_COPY = {
  en: {
    subjectDeath:   "{{client}}'s Everstead vault has been activated",
    subjectIncap:   "{{client}}'s Everstead vault has been activated",
    title:          "A client's vault has been activated",
    leadDeath:      'Everstead has verified a report that <strong>{{client}}</strong>, a client linked to {{firm}}, has died. We are sorry to be the ones to tell you.',
    leadIncap:      'Everstead has verified a report that <strong>{{client}}</strong>, a client linked to {{firm}}, is no longer able to manage their own affairs.',
    activated:      'Their vault was activated on {{date}} for the people they named. {{client}} asked us to let your firm know when this happened.',
    dod:            'Date of death as recorded by the reporter: <strong>{{date}}</strong>.',
    reporter:       'Reported by {{reporter}}{{role}}.',
    sharedTitle:    'What your firm can see',
    sharedSome:     '{{client}} shared the following sections with your firm: <strong>{{sections}}</strong>. The estate pack in the portal gathers them into one file, with the document files attached.',
    sharedNone:     '{{client}} had not shared any sections of their plan with your firm. The people they named as trusted contacts can still provide what you need.',
    button:         'Open the adviser portal',
    footer:         'This message is confidential and intended for {{firm}}. Everstead is an organisation tool and does not provide legal, tax or financial advice.',
    roleWord:       ', {{role}}',
    sections:       { accounts: 'Accounts and assets', documents: 'Documents', instructions: 'Instructions', people: 'Trusted people', alerts: 'Alerts' },
  },
  fr: {
    subjectDeath:   'Le coffre Everstead de {{client}} a été activé',
    subjectIncap:   'Le coffre Everstead de {{client}} a été activé',
    title:          "Le coffre d'un client a été activé",
    leadDeath:      "Everstead a vérifié un signalement du décès de <strong>{{client}}</strong>, client rattaché à {{firm}}. Nous sommes désolés de vous l'apprendre par ce message.",
    leadIncap:      "Everstead a vérifié un signalement selon lequel <strong>{{client}}</strong>, client rattaché à {{firm}}, n'est plus en mesure de gérer ses affaires.",
    activated:      "Son coffre a été activé le {{date}} pour les personnes qu'il avait désignées. {{client}} nous avait demandé de prévenir votre cabinet le moment venu.",
    dod:            'Date du décès indiquée par le déclarant : <strong>{{date}}</strong>.',
    reporter:       'Signalement effectué par {{reporter}}{{role}}.',
    sharedTitle:    'Ce que votre cabinet peut consulter',
    sharedSome:     '{{client}} partageait les rubriques suivantes avec votre cabinet : <strong>{{sections}}</strong>. Le dossier succession, disponible dans le portail, les réunit en un seul fichier avec les documents joints.',
    sharedNone:     "{{client}} n'avait partagé aucune rubrique de son coffre avec votre cabinet. Ses personnes de confiance pourront vous transmettre ce dont vous avez besoin.",
    button:         'Ouvrir le portail conseiller',
    footer:         "Ce message est confidentiel et destiné à {{firm}}. Everstead est un outil d'organisation et ne fournit aucun conseil juridique, fiscal ou financier.",
    roleWord:       ' ({{role}})',
    sections:       { accounts: 'Comptes et actifs', documents: 'Documents', instructions: 'Consignes', people: 'Personnes de confiance', alerts: 'Alertes' },
  },
}

const fill = (s, vars) => String(s).replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')

export async function sendVaultActivatedNotice({ to, lang = 'en', firmName, clientName, type = 'death', verifiedAt, dateOfDeath, reporterName, reporterRole, sharedSections = [] }) {
  if (!to) return false
  const L = lang === 'fr' ? 'fr' : 'en'
  const C = ACTIVATED_COPY[L]
  const vars = {
    client: esc(clientName || (L === 'fr' ? 'votre client' : 'your client')),
    firm:   esc(firmName || (L === 'fr' ? 'votre cabinet' : 'your firm')),
    date:   verifiedAt ? new Date(verifiedAt).toLocaleDateString(L === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
  }
  const sections = sharedSections.map(k => C.sections[k]).filter(Boolean).join(', ')
  const dodLine  = dateOfDeath ? `<p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">${fill(C.dod, { date: esc(dateOfDeath) })}</p>` : ''
  const repLine  = reporterName
    ? `<p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;">${fill(C.reporter, { reporter: esc(reporterName), role: reporterRole ? fill(C.roleWord, { role: esc(reporterRole) }) : '' })}</p>`
    : ''
  const inner = `
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${C.title}</h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">${fill(type === 'death' ? C.leadDeath : C.leadIncap, vars)}</p>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">${fill(C.activated, vars)}</p>
    ${dodLine}${repLine}
    <p style="margin:24px 0 6px;color:#0d1628;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">${C.sharedTitle}</p>
    <p style="margin:0 0 28px;color:#4a5568;font-size:16px;line-height:1.6;">${fill(sections ? C.sharedSome : C.sharedNone, { ...vars, sections: esc(sections) })}</p>
    ${button(`${APP}/advisor-portal`, C.button)}
    <p style="margin:28px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;">${fill(C.footer, vars)}</p>`
  try {
    await resend.emails.send({
      from: FROM, to,
      subject: fill(type === 'death' ? C.subjectDeath : C.subjectIncap, { client: clientName || '' }),
      html: shell(inner),
    })
    return true
  } catch (err) {
    console.error('[adviser-email] vault-activated notice failed:', err?.message)
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Document requests: the firm asks a client for a document; the client is told
// by email and sees a prompt in their vault. When they attach it, the firm is
// told. Both in the recipient's own language.
// ─────────────────────────────────────────────────────────────────────────────
const REQUEST_COPY = {
  en: {
    subject:          '{{firm}} has asked you for a document',
    subjectReminder:  'Reminder: {{firm}} is still waiting for a document',
    title:            'A document request from {{firm}}',
    titleReminder:    'A gentle reminder from {{firm}}',
    lead:             '<strong>{{firm}}</strong> has asked you to add the following to your Everstead vault:',
    leadReminder:     '<strong>{{firm}}</strong> asked you for the document below a little while ago and has not received it yet:',
    noteLabel:        'Their note',
    how:              'Upload it under Documents, then attach it to the request shown at the top of that page. Nothing is shared with your firm until you choose to share your documents with them.',
    button:           'Open my documents',
    footer:           'You are receiving this because your Everstead vault is linked to {{firm}}. You can change what they see at any time in Settings.',
  },
  fr: {
    subject:          '{{firm}} vous demande un document',
    subjectReminder:  'Rappel : {{firm}} attend toujours un document',
    title:            'Une demande de document de {{firm}}',
    titleReminder:    'Un petit rappel de {{firm}}',
    lead:             '<strong>{{firm}}</strong> vous demande d\'ajouter le document suivant à votre coffre Everstead :',
    leadReminder:     '<strong>{{firm}}</strong> vous a demandé le document ci-dessous il y a quelque temps et ne l\'a pas encore reçu :',
    noteLabel:        'Leur message',
    how:              'Déposez-le dans Documents, puis rattachez-le à la demande affichée en haut de cette page. Rien n\'est transmis à votre cabinet tant que vous n\'avez pas choisi de partager vos documents avec lui.',
    button:           'Ouvrir mes documents',
    footer:           'Vous recevez ce message parce que votre coffre Everstead est rattaché à {{firm}}. Vous pouvez modifier ce qu\'il peut consulter à tout moment dans les Réglages.',
  },
}

export async function sendDocumentRequestEmail({ to, lang = 'en', firmName, docType, note, reminder = false }) {
  if (!to) return false
  const L = lang === 'fr' ? 'fr' : 'en'
  const C = REQUEST_COPY[L]
  const vars = { firm: esc(firmName || (L === 'fr' ? 'votre cabinet' : 'your firm')) }
  const url = `${APP}${L === 'fr' ? '/fr' : ''}/dashboard?tab=documents`
  const inner = `
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${fill(reminder ? C.titleReminder : C.title, vars)}</h1>
    <p style="margin:0 0 14px;color:#4a5568;font-size:16px;line-height:1.6;">${fill(reminder ? C.leadReminder : C.lead, vars)}</p>
    <p style="margin:0 0 18px;padding:14px 18px;border-radius:12px;background:#f0f3f9;color:#0d1628;font-size:17px;font-weight:600;">${esc(docType)}</p>
    ${note ? `<p style="margin:0 0 6px;color:#0d1628;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">${C.noteLabel}</p><p style="margin:0 0 18px;color:#4a5568;font-size:15px;line-height:1.6;border-left:3px solid #e8e5e0;padding-left:14px;font-style:italic;">${esc(note)}</p>` : ''}
    <p style="margin:0 0 28px;color:#4a5568;font-size:15px;line-height:1.6;">${C.how}</p>
    ${button(url, C.button)}
    <p style="margin:28px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;">${fill(C.footer, vars)}</p>`
  try {
    await resend.emails.send({ from: FROM, to, subject: fill(reminder ? C.subjectReminder : C.subject, { firm: firmName || '' }), html: shell(inner) })
    return true
  } catch (err) {
    console.error('[adviser-email] document request failed:', err?.message)
    return false
  }
}

const UPLOADED_COPY = {
  en: {
    subject: '{{client}} has attached {{doc}}',
    title:   'A requested document has arrived',
    lead:    '<strong>{{client}}</strong> has attached <strong>{{doc}}</strong> to the request from {{firm}}.',
    file:    'File name: {{name}}',
    how:     'It is waiting in your review queue. Open the portal to review it and confirm where the original is stored.',
    button:  'Open the review queue',
    footer:  'This message is confidential and intended for {{firm}}.',
  },
  fr: {
    subject: '{{client}} a joint {{doc}}',
    title:   'Un document demandé est arrivé',
    lead:    '<strong>{{client}}</strong> a rattaché <strong>{{doc}}</strong> à la demande de {{firm}}.',
    file:    'Nom du fichier : {{name}}',
    how:     'Il vous attend dans la file de relecture. Ouvrez le portail pour le consulter et confirmer où se trouve l\'original.',
    button:  'Ouvrir la file de relecture',
    footer:  'Ce message est confidentiel et destiné à {{firm}}.',
  },
}

export async function sendDocumentUploadedNotice({ to, lang = 'en', firmName, clientName, docType, documentName }) {
  if (!to) return false
  const L = lang === 'fr' ? 'fr' : 'en'
  const C = UPLOADED_COPY[L]
  const vars = { firm: esc(firmName || ''), client: esc(clientName || ''), doc: esc(docType || ''), name: esc(documentName || '') }
  const inner = `
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${C.title}</h1>
    <p style="margin:0 0 14px;color:#4a5568;font-size:16px;line-height:1.6;">${fill(C.lead, vars)}</p>
    ${documentName ? `<p style="margin:0 0 14px;color:#4a5568;font-size:14px;">${fill(C.file, vars)}</p>` : ''}
    <p style="margin:0 0 28px;color:#4a5568;font-size:15px;line-height:1.6;">${C.how}</p>
    ${button(`${APP}/advisor-portal`, C.button)}
    <p style="margin:28px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;">${fill(C.footer, vars)}</p>`
  try {
    await resend.emails.send({ from: FROM, to, subject: fill(C.subject, { client: clientName || '', doc: docType || '' }), html: shell(inner) })
    return true
  } catch (err) {
    console.error('[adviser-email] document uploaded notice failed:', err?.message)
    return false
  }
}
