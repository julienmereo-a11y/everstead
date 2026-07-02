import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'
import { withSentry } from '../lib/sentry.js'

// Service-role client: verifies the caller's JWT and records the device.
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)
const resend = new Resend(process.env.RESEND_API_KEY)

// Called right after a successful sign-in. Records the device the user signed in
// from and, when it's a new one (and not their very first), emails a heads-up so a
// sign-in they didn't make is visible to them.
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { deviceId } = req.body || {}
  if (!deviceId || typeof deviceId !== 'string') return res.status(400).json({ error: 'Missing deviceId' })

  // Hash the client device id with the user id so the stored value isn't reversible
  // and can't be correlated across users.
  const deviceHash = crypto.createHash('sha256').update(`${user.id}:${deviceId}`).digest('hex')
  const userAgent  = String(req.headers['user-agent'] || '').slice(0, 300)

  const { data: existing } = await supabase
    .from('known_devices')
    .select('device_hash')
    .eq('user_id', user.id)

  const devices = existing || []
  const isKnown = devices.some(d => d.device_hash === deviceHash)

  if (isKnown) {
    await supabase.from('known_devices')
      .update({ last_seen: new Date().toISOString(), user_agent: userAgent })
      .eq('user_id', user.id).eq('device_hash', deviceHash)
    return res.status(200).json({ known: true })
  }

  // New device: record it.
  await supabase.from('known_devices').insert({ user_id: user.id, device_hash: deviceHash, user_agent: userAgent })

  // Best-effort audit entry (the append-only activity_log).
  try {
    await supabase.from('activity_log').insert({
      user_id: user.id, actor_id: user.id, action: 'auth.new_device_login',
      resource_type: 'auth', metadata: { user_agent: userAgent },
    })
  } catch { /* never block on logging */ }

  // Only alert if they already had a device on file — skip the very first sign-in
  // (signup), which would otherwise always fire an alert.
  let alerted = false
  if (devices.length > 0 && user.email) {
    try {
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      user.email,
        subject: 'New sign-in to your Everstead account',
        html:    newDeviceHtml(userAgent),
      })
      alerted = true
    } catch { /* alert is best-effort */ }
  }

  return res.status(200).json({ known: false, alerted })
}

function newDeviceHtml(userAgent) {
  const ua = (userAgent || 'an unrecognised device').replace(/[<>]/g, '')
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0d1628;line-height:1.6;max-width:520px;margin:0 auto;padding:24px">
    <h2 style="margin:0 0 8px;font-weight:600">New sign-in to your account</h2>
    <p style="margin:0 0 12px;color:#44506a">There was a new sign-in to your Everstead account from a device we hadn't seen before:</p>
    <p style="margin:0 0 16px;padding:12px 14px;background:#f5f5f4;border-radius:10px;font-size:13px;color:#44506a">${ua}</p>
    <p style="margin:0 0 12px;color:#44506a">If this was you, you can ignore this email.</p>
    <p style="margin:0 0 12px;color:#44506a"><strong>If this wasn't you</strong>, please reset your password right away and review who has access in your dashboard.</p>
    <p style="margin:20px 0 0;font-size:12px;color:#8a8a8a">Everstead — your plan, kept safe.</p>
  </body></html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
