import { createClient } from '@supabase/supabase-js'
import { withSentry } from '../lib/sentry.js'
import { registerPushToken, pushConfigured } from '../lib/push.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Called by the native app after APNs/FCM registration: attaches the device's
// push token to the signed-in user in OneSignal (external_id = user id).
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const jwt = req.headers.authorization?.replace('Bearer ', '')
  const { token, platform } = req.body || {}
  if (!jwt || !token) return res.status(400).json({ error: 'Missing fields' })

  const { data: { user }, error } = await supabase.auth.getUser(jwt)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  if (!pushConfigured()) return res.status(200).json({ skipped: true })

  const out = await registerPushToken({ userId: user.id, token, platform })
  res.status(200).json({ ok: out.ok !== false })
}

export default withSentry(handler)
