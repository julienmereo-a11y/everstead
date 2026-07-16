import { createClient } from '@supabase/supabase-js'
import { withSentry } from '../lib/sentry.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Signed media URL for a delegate viewing a released Personal Message.
//
// The `messages` bucket is PRIVATE and its owner-scoped storage policy doesn't
// cover delegates, so the delegate dashboard asks the server. Authorization
// mirrors get_delegate_messages (the RPC that lists these messages): the caller
// must be signed in, their auth email must match the accepted trusted_people
// row for the invite token, the message must belong to that owner and be
// addressed to them, and it must actually be visible (released, or after_death
// once the owner's passing is verified — never an unreleased on_date message).
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const jwt = req.headers.authorization?.replace('Bearer ', '')
  const { inviteToken, messageId } = req.body || {}
  if (!jwt || !inviteToken || !messageId) return res.status(400).json({ error: 'Missing fields' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
  if (authErr || !user?.email) return res.status(401).json({ error: 'Unauthorized' })

  const { data: tp } = await supabase
    .from('trusted_people')
    .select('user_id, name, email, invite_status')
    .eq('invite_token', inviteToken)
    .maybeSingle()
  if (!tp || tp.invite_status !== 'accepted' || tp.email?.toLowerCase() !== user.email.toLowerCase()) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { data: msg } = await supabase
    .from('messages')
    .select('user_id, recipient_name, released, release_timing, media_url, video_url')
    .eq('id', messageId)
    .maybeSingle()
  if (!msg || msg.user_id !== tp.user_id) return res.status(404).json({ error: 'not_found' })
  if ((msg.recipient_name || '').trim().toLowerCase() !== (tp.name || '').trim().toLowerCase()) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (!msg.released) {
    // Sealed: only visible when it's an after_death message and the owner's
    // passing/incapacity is verified. on_date messages stay sealed until their
    // day regardless — the delivery cron releases them.
    const { data: owner } = await supabase
      .from('profiles').select('owner_status').eq('id', tp.user_id).single()
    const suspended = ['deceased', 'incapacitated'].includes(owner?.owner_status)
    if (!(suspended && msg.release_timing === 'after_death')) {
      return res.status(403).json({ error: 'Forbidden' })
    }
  }

  const storedUrl = msg.media_url || msg.video_url
  if (!storedUrl) return res.status(404).json({ error: 'no_media' })
  const m = String(storedUrl).match(/\/object\/(?:public|sign)\/messages\/([^?]+)/)
    || String(storedUrl).match(/\/messages\/([^?]+)/)
  const path = m ? decodeURIComponent(m[1]) : String(storedUrl)
  const { data, error } = await supabase.storage.from('messages').createSignedUrl(path, 60 * 60)
  if (error || !data?.signedUrl) return res.status(500).json({ error: 'Could not load the media' })

  return res.status(200).json({ url: data.signedUrl })
}

export default withSentry(handler)
