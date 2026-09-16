import { createClient } from '@supabase/supabase-js'
import { withSentry, captureException } from '../_lib/sentry.js'
import { bearerMatches } from '../_lib/bearer-secret.js'

// Staged deliveries do not get to sit there forever.
//
// Accepting or declining clears the staged object immediately. Two cases do
// not, and this is what clears them:
//
//   • 'sent' past its expiry: nobody ever answered. Mark it expired and delete
//     the file.
//   • 'downloaded' past its expiry: taken without an account, and the link was
//     deliberately left working so the person could come back to it. Once the
//     window closes the copy in staging has no further purpose, so it goes.
//
// We are holding other people's documents in a bucket neither party can see.
// Keeping them past their usefulness is the kind of thing that turns into a
// disclosure, so this runs daily.
const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function handler(req, res) {
  if (!bearerMatches(req.headers['authorization'], process.env.CRON_SECRET)) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  const now = new Date().toISOString()
  let expired = 0, purged = 0

  try {
    // Never answered.
    const { data: stale } = await db.from('inbound_deliveries')
      .select('id, storage_path')
      .eq('status', 'sent').lt('expires_at', now).limit(500)
    if (stale?.length) {
      await db.from('inbound_deliveries')
        .update({ status: 'expired', responded_at: now, claim_token: null, claim_code_hash: null })
        .in('id', stale.map(r => r.id))
      await db.storage.from('deliveries').remove(stale.map(r => r.storage_path)).catch(() => {})
      expired = stale.length
    }

    // Taken without an account; the re-download window has closed.
    const { data: done } = await db.from('inbound_deliveries')
      .select('id, storage_path')
      .eq('status', 'downloaded').lt('expires_at', now)
      .not('storage_path', 'is', null).limit(500)
    if (done?.length) {
      await db.storage.from('deliveries').remove(done.map(r => r.storage_path)).catch(() => {})
      await db.from('inbound_deliveries')
        .update({ claim_token: null, claim_code_hash: null })
        .in('id', done.map(r => r.id))
      purged = done.length
    }
  } catch (err) {
    console.error('[cron/delivery-cleanup]', err)
    captureException(err, { endpoint: 'cron/delivery-cleanup' })
    return res.status(500).json({ error: 'Cleanup failed' })
  }

  return res.status(200).json({ expired, purged })
}

export default withSentry(handler)
