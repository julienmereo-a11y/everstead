import { Resend } from 'resend'
import { requireAdmin, adminNeedsMfa } from '../_lib/admin-auth.js'
import { withSentry, captureException } from '../lib/sentry.js'

// Emails the founder whenever an admin session opens the admin panel, so an
// unexpected sign-in is visible rather than silent. The panel calls this once
// per browser session; requireAdmin means only a real admin can trigger it.
//
// Deliberately reports the IP and user agent only: enough to recognise "that
// was not me", nothing that would itself be worth stealing.
const resend = new Resend(process.env.RESEND_API_KEY)
const ALERT_TO = process.env.FOUNDER_TO || process.env.FEEDBACK_TO || 'julien@everstead.care'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  const ua = req.headers['user-agent'] || 'unknown'
  const when = new Date().toLocaleString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  })
  const needsMfa = await adminNeedsMfa(admin.id)

  try {
    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      ALERT_TO,
      subject: `🔐 Admin panel opened, ${admin.email}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px;background:#f9fafb;font-family:system-ui,sans-serif;">
  <table style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <tr><td style="background:#0d1628;padding:20px 24px;">
      <p style="margin:0;color:#fff;font-size:16px;font-weight:600;">Admin panel opened</p>
    </td></tr>
    <tr><td style="padding:22px 24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;width:120px;">Account</td><td style="padding:6px 0;color:#0d1628;font-size:14px;font-weight:500;">${esc(admin.email)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">When</td><td style="padding:6px 0;color:#0d1628;font-size:14px;font-weight:500;">${esc(when)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">IP</td><td style="padding:6px 0;color:#0d1628;font-size:14px;font-weight:500;">${esc(ip)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Device</td><td style="padding:6px 0;color:#0d1628;font-size:13px;">${esc(ua)}</td></tr>
      </table>
      ${needsMfa ? `<p style="margin:18px 0 0;padding:12px 14px;background:#fef3c7;border-radius:8px;color:#92400e;font-size:13px;line-height:1.5;">This admin account has no authenticator app enrolled. Until it does, a stolen password is enough to reach this panel.</p>` : ''}
      <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">If this was not you, change the account password immediately and revoke active sessions in Supabase.</p>
    </td></tr>
  </table>
</body></html>`,
    })
    return res.status(200).json({ ok: true, needsMfa })
  } catch (err) {
    // Never block the panel on a failed alert, but make the failure visible:
    // a silently broken security alert is worse than none.
    console.error('admin/signin-alert error:', err)
    captureException(err, { endpoint: 'admin/signin-alert' })
    return res.status(200).json({ ok: false, needsMfa })
  }
}

export default withSentry(handler)
