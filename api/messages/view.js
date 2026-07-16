import { createClient } from '@supabase/supabase-js'
import { withSentry } from '../lib/sentry.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// PUBLIC endpoint — fetch a single personal message by its secure view token.
// No auth: the unguessable token IS the credential. Only returns a message that
// has been released, and only a minimal set of safe fields.
async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()

  const token = req.method === 'GET' ? req.query.token : req.body?.token
  if (!token || typeof token !== 'string' || token.length < 16) {
    return res.status(400).json({ error: 'Missing token' })
  }

  // Lowercase the token before lookup — new tokens are lowercase hex, and email
  // link-rewriters can change case in transit. Stored tokens are lowercase.
  const { data: msg, error } = await supabase
    .from('messages')
    .select('user_id, title, content, type, media_url, video_url, recipient_name, released, released_at')
    .eq('view_token', token.toLowerCase())
    .maybeSingle()

  if (error) return res.status(500).json({ error: 'Could not load the message' })
  if (!msg || !msg.released) return res.status(404).json({ error: 'not_found' })

  // Sender's display name for a personal greeting
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', msg.user_id)
    .single()

  return res.status(200).json({
    title:         msg.title,
    content:       msg.content,
    type:          msg.type || 'note',
    mediaUrl:      await signedMediaUrl(msg.media_url || msg.video_url),
    recipientName: msg.recipient_name || null,
    senderName:    profile?.full_name || 'Someone',
    releasedAt:    msg.released_at,
  })
}

// The `messages` bucket is PRIVATE (sealed media must not be fetchable by URL
// alone) — stored values are legacy public-style URLs that encode the path.
// Mint a signed URL with the service role; the recipient's proof of entitlement
// is the view token that got them here. 24h covers a long reading session.
async function signedMediaUrl(storedUrl) {
  if (!storedUrl) return null
  const m = String(storedUrl).match(/\/object\/(?:public|sign)\/messages\/([^?]+)/)
    || String(storedUrl).match(/\/messages\/([^?]+)/)
  const path = m ? decodeURIComponent(m[1]) : String(storedUrl)
  const { data, error } = await supabase.storage.from('messages').createSignedUrl(path, 60 * 60 * 24)
  if (error) return null
  return data?.signedUrl || null
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
