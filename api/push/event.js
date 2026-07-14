import { withSentry } from '../lib/sentry.js'
import { sendPushToUsers, pushConfigured } from '../lib/push.js'

// Receives Postgres trigger webhooks (pg_net) for events that should push to the
// owner's phone — things local notifications can't know about because they happen
// server-side or from someone else's device:
//   • alerts INSERT                    → "Something needs your attention"
//   • trusted_people → accepted        → "X accepted your invite"
// Secured by a shared secret header (PUSH_WEBHOOK_SECRET) — the trigger embeds it,
// so nothing else can make this endpoint send notifications.
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const secret = process.env.PUSH_WEBHOOK_SECRET
  if (!secret || req.headers['x-push-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!pushConfigured()) return res.status(200).json({ skipped: true })

  const { table, record } = req.body || {}
  if (!table || !record?.user_id) return res.status(400).json({ error: 'Bad payload' })

  let title = null
  let body = null

  if (table === 'alerts') {
    title = record.title || 'Something needs your attention'
    body = record.detail || 'Open Everstead to review it.'
  } else if (table === 'trusted_people') {
    title = `${record.name || 'Someone'} accepted your invite`
    body = 'They can now see what you chose to share with them.'
  }

  if (!title) return res.status(200).json({ skipped: true })

  await sendPushToUsers({
    userIds: [record.user_id],
    title,
    body,
    data: { table, id: record.id },
  })
  res.status(200).json({ ok: true })
}

export default withSentry(handler)
