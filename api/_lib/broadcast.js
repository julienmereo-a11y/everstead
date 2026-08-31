import { Resend } from 'resend'
import { adminDb as db } from './admin-auth.js'

// ─────────────────────────────────────────────────────────────────────────────
// Shared broadcast-email machinery, used by BOTH:
//   • api/admin/broadcast-email.js  (immediate sends + scheduling from the panel)
//   • api/cron/send-scheduled-broadcasts.js  (delivers due scheduled rows)
// Keeping audience resolution and rendering here guarantees a scheduled send
// behaves identically to an immediate one.
// ─────────────────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY)
const BATCH_SIZE = 50

// Selectable senders — a strict allowlist (never client-supplied free text). All are
// on the Resend-verified everstead.care domain; replies reach the same mailbox
// (hello@ and support@ are Workspace aliases of julien@).
export const SENDERS = {
  hello:   'Everstead <hello@everstead.care>',
  julien:  'Julien from Everstead <julien@everstead.care>',
  support: 'Everstead Support <support@everstead.care>',
}

export const AUDIENCES = new Set(['all', 'free', 'essential', 'family', 'advisor', 'founding', 'trialing', 'payment_issue', 'emails'])

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))

export const firstName = (fullName) => (fullName || '').trim().split(/\s+/)[0] || 'there'

export const personalise = (text, name) => text.replaceAll('{{name}}', name)

// Turn bare URLs in already-escaped text into clickable links. Runs AFTER esc(),
// so any & in a query string is already &amp; — the correct encoding inside an
// href attribute. Trailing sentence punctuation is kept outside the link.
function linkify(escapedText) {
  return escapedText.replace(/https?:\/\/[^\s<]+/g, (url) => {
    const trail = (/[.,;:!?)\]]+$/.exec(url) || [''])[0]
    const clean = trail ? url.slice(0, -trail.length) : url
    return `<a href="${clean}" style="color:#4c7d47;text-decoration:underline;">${clean}</a>${trail}`
  })
}

// Escaped plain text → paragraphs (blank line), line breaks, clickable URLs.
function messageHtml(message) {
  return esc(message).trim()
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">${linkify(p).replace(/\n/g, '<br/>')}</p>`)
    .join('\n')
}

export function emailHtml({ message, name }) {
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
          ${messageHtml(personalise(message, name))}
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0 0 6px;color:#9ca3af;font-size:13px;line-height:1.5;">You're receiving this because you have an Everstead account.</p>
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            <a href="${process.env.VITE_APP_URL || 'https://www.everstead.care'}/dashboard?tab=settings" style="color:#4c7d47;">Manage your email preferences</a>
            · <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

// Resolve recipients server-side from profiles. The client is never trusted with
// the list — 'emails' is intersected with existing accounts, so this can never be
// used to email arbitrary addresses. Excludes suspended accounts and (by default)
// marketing opt-outs; dedupes case-insensitively.
export async function resolveAudience({ audience, emails, respectMarketingPrefs, language }) {
  let query = db.from('profiles')
    .select('id, email, full_name, plan, subscription_status, is_founding_member, marketing_emails_enabled, is_suspended, language')
    .not('email', 'is', null)

  // Language crosses the audience ("free members, in French"). 'fr' matches
  // exactly; 'en' matches everything that is not 'fr', NULL included, so a
  // profile that somehow lost its language never falls out of every broadcast.
  if (language === 'fr') query = query.eq('language', 'fr')
  if (language === 'en') query = query.or('language.eq.en,language.is.null')

  if (['free', 'essential', 'family', 'advisor'].includes(audience)) query = query.eq('plan', audience)
  if (audience === 'founding')      query = query.eq('is_founding_member', true)
  if (audience === 'trialing')      query = query.eq('subscription_status', 'trialing')
  if (audience === 'payment_issue') query = query.in('subscription_status', ['trial_expired', 'past_due'])

  const { data, error } = await query.limit(10000)
  if (error) throw new Error(`Could not resolve audience: ${error.message}`)

  let rows = (data ?? []).filter(u => u.is_suspended !== true)
  if (respectMarketingPrefs) rows = rows.filter(u => u.marketing_emails_enabled !== false)

  if (audience === 'emails') {
    const wanted = new Set((emails ?? []).map(e => String(e).trim().toLowerCase()).filter(Boolean))
    if (wanted.size === 0) return []
    rows = rows.filter(u => wanted.has(u.email.toLowerCase()))
  }

  const seen = new Set()
  return rows.filter(u => {
    const key = u.email.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Send one composed broadcast to already-resolved recipients via Resend's batch
// API, personalised per recipient. Failures are counted, never thrown mid-run —
// one bad chunk must not abort the broadcast. onChunkError gets non-fatal errors.
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function sendBatch(chunk, { from, subject, message, idempotencyKey }) {
  try {
    return await resend.batch.send(chunk.map(u => {
      const name = firstName(u.full_name)
      return {
        from,
        to: u.email,
        subject: personalise(subject, name),
        html: emailHtml({ message, name }),
      }
    }), idempotencyKey ? { idempotencyKey } : undefined)
  } catch (err) {
    return { error: err }
  }
}

// Resilient delivery. Lessons from the 2026-08-05 broadcast (50 sent / 23 failed
// with the error swallowed): batches are paced (the Resend rate limit is shared
// with every cron on the key), a failed batch is retried once, and if it still
// fails the chunk falls back to INDIVIDUAL sends — so a single bad address can
// 422 only itself, never the other recipients in its batch. Errors are logged
// (message/status only — never recipient addresses).
export async function sendToRecipients({ recipients, from, subject, message, onChunkError, runId }) {
  let sent = 0
  let failed = 0
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE)
    if (i > 0) await sleep(1200)

    // The idempotency key makes the retry safe: if the batch was ACCEPTED but the
    // response failed (the 2026-08-05 broadcast — Resend delivered all 23 of a
    // chunk we counted as failed), retrying with the same key is deduped
    // server-side instead of double-sending.
    const idempotencyKey = runId ? `broadcast-${runId}-chunk-${i}` : undefined
    let result = await sendBatch(chunk, { from, subject, message, idempotencyKey })
    if (result.error) {
      console.log('broadcast: batch failed, retrying once, ',
        result.error?.message || result.error?.name || 'unknown error', '· offset', i)
      await sleep(1500)
      result = await sendBatch(chunk, { from, subject, message, idempotencyKey })
    }
    if (!result.error) {
      sent += result.data?.data?.length ?? chunk.length
      continue
    }

    console.log('broadcast: batch retry failed, falling back to individual sends, ',
      result.error?.message || result.error?.name || 'unknown error', '· offset', i)
    onChunkError?.(result.error instanceof Error ? result.error : new Error(result.error?.message || 'batch send failed'), i)
    for (const u of chunk) {
      await sleep(600)
      try {
        const name = firstName(u.full_name)
        const { error } = await resend.emails.send({
          from,
          to: u.email,
          subject: personalise(subject, name),
          html: emailHtml({ message, name }),
        }, runId ? { idempotencyKey: `broadcast-${runId}-r-${i + chunk.indexOf(u)}` } : undefined)
        if (error) {
          failed += 1
          console.log('broadcast: individual send failed, ', error?.message || error?.name || 'unknown error')
        } else {
          sent += 1
        }
      } catch (err) {
        failed += 1
        console.log('broadcast: individual send threw, ', err?.message || 'unknown error')
      }
    }
  }
  return { sent, failed }
}

export async function sendTestEmail({ to, name, from, subject, message }) {
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `[TEST] ${personalise(subject, name)}`,
    html: emailHtml({ message, name }),
  })
  if (error) throw new Error(error.message || 'Test send failed')
}
