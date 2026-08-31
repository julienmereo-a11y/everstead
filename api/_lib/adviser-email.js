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
