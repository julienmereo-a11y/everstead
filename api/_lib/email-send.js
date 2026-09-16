// Shared send helper for customer emails.
//
// Every template in api/ builds its own HTML (they are plain tagged strings on
// purpose), so the things that must be true of EVERY email live here instead:
//   • a plain-text alternative, derived from the HTML (spam filters score
//     HTML-only mail down, and some clients show text first);
//   • a preheader, the one line inbox previews show under the subject;
//   • one-click unsubscribe headers (RFC 8058) on marketing mail, which Gmail
//     and Yahoo require of bulk senders and which surface the "Unsubscribe"
//     link next to the sender name;
//   • the company line for footers, in one place.
//
// Usage:
//   import { sendEmail, unsubscribeUrl, COMPANY_LINE } from '../_lib/email-send.js'
//   await sendEmail(resend, { from, to, subject, html, preheader, unsubUrl: unsubscribeUrl(user.id) })
//
// Pass `unsubUrl` for marketing mail only (drip, nudges, check-ins, broadcasts,
// lead magnets). Account mail (sign-in codes, trial reminders, deletion notices)
// sends without it and gets no List-Unsubscribe header.

export const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'
export const COMPANY_LINE = 'Everstead Digital Ltd, registered in England &amp; Wales, No. 17166825, London'
export const COMPANY_LINE_FR = 'Everstead Digital Ltd, société enregistrée en Angleterre et au pays de Galles, n° 17166825, Londres'

export const companyLine = (lang) => (String(lang || '').slice(0, 2).toLowerCase() === 'fr' ? COMPANY_LINE_FR : COMPANY_LINE)

/** One-click marketing unsubscribe link for an account holder (api/email/unsubscribe). */
export function unsubscribeUrl(userId) {
  if (!userId) return null
  return `${APP_URL}/api/email/unsubscribe?token=${Buffer.from(String(userId)).toString('base64url')}`
}

export function marketingHeaders(unsubUrl) {
  if (!unsubUrl) return undefined
  return {
    'List-Unsubscribe':      `<${unsubUrl}>, <mailto:hello@everstead.care?subject=Unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

/** Hidden preview line, injected right after <body>. Padded so clients do not pull body text after it. */
export function withPreheader(html, preheader) {
  if (!preheader) return html
  const pad = '&#847;&zwnj;&nbsp;'.repeat(30)
  const span = `<span class="es-preheader" style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;">${escapeText(preheader)}${pad}</span>`
  return html.replace(/<body([^>]*)>/i, (m) => `${m}\n${span}`)
}

/** Plain-text alternative derived from the HTML: links keep their URL, structure keeps its line breaks. */
export function textFromHtml(html) {
  let s = String(html || '')
  s = s.replace(/<head[\s\S]*?<\/head>/gi, '')
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '')
  s = s.replace(/<span class="es-preheader"[\s\S]*?<\/span>/gi, '')
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, label) => {
    const text = label.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (!text) return href
    if (/^mailto:/i.test(href)) return text
    const clean = href.replace(/&amp;/g, '&')
    return text === clean ? text : `${text} (${clean})`
  })
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<(p|h1|h2|h3|h4|div|table|tr)\b[^>]*>/gi, '\n')
  s = s.replace(/<li\b[^>]*>/gi, '\n• ')
  s = s.replace(/<\/(p|h1|h2|h3|h4|tr|li|div|table)>/gi, '\n')
  s = s.replace(/<\/td>/gi, ' ')
  s = s.replace(/<[^>]+>/g, '')
  s = s.replace(/&nbsp;/g, ' ').replace(/&#160;/g, ' ').replace(/&middot;/g, '·')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#847;|&zwnj;/g, '')
  s = s.split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n')
  s = s.replace(/\n{3,}/g, '\n\n').trim()
  return s
}

function escapeText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Build the Resend payload: HTML with preheader, derived text, and marketing headers when unsubUrl is given. */
export function buildEmail({ from, to, subject, html, preheader, unsubUrl, headers, replyTo, attachments }) {
  const finalHtml = withPreheader(html, preheader)
  const allHeaders = { ...(marketingHeaders(unsubUrl) || {}), ...(headers || {}) }
  const payload = { from, to, subject, html: finalHtml, text: textFromHtml(finalHtml) }
  if (replyTo) payload.replyTo = replyTo
  // Resend takes [{ filename, content }] with content as a Buffer or base64.
  if (attachments?.length) payload.attachments = attachments
  if (Object.keys(allHeaders).length) payload.headers = allHeaders
  return payload
}

export function sendEmail(resend, fields, options) {
  return resend.emails.send(buildEmail(fields), options)
}
