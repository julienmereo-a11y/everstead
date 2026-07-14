import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'node:crypto'
import { withSentry } from '../lib/sentry.js'
import { sendPushToUsers, pushConfigured } from '../lib/push.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const secretMatches = (given, expected) => {
  const a = Buffer.from(String(given ?? ''))
  const b = Buffer.from(String(expected))
  return a.length === b.length && timingSafeEqual(a, b)
}

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
  if (!secret || !secretMatches(req.headers['x-push-secret'], secret)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!pushConfigured()) return res.status(200).json({ skipped: true })

  const { table, record } = req.body || {}
  if (!table || !record?.user_id) return res.status(400).json({ error: 'Bad payload' })

  let title = null
  let body = null

  if (table === 'alerts') {
    // Honour the user's notify_* toggles — the same ones Settings writes and the
    // email crons + on-device reminders respect. Without this, someone who turned
    // "Document expiry reminders" OFF would still get pushed the cron's expiry
    // alerts, and someone who left it ON would get BOTH a local reminder and a push.
    const auto = record.auto_generated !== false
    if (auto && record.category) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('notify_document_expiry, notify_vault_nudges, notify_annual_review')
        .eq('id', record.user_id)
        .maybeSingle()
      const off = {
        documents: prof?.notify_document_expiry === false,
        vault:     prof?.notify_vault_nudges === false,
        review:    prof?.notify_annual_review === false,
      }[record.category]
      if (off) return res.status(200).json({ skipped: 'user opted out' })
    }
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
