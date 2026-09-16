import { createClient } from '@supabase/supabase-js'
import { withSentry, captureException } from '../_lib/sentry.js'
import { sendOrgRequestEmail } from '../_lib/adviser-email.js'

// Nudge people who were asked for something and have not answered.
//
// The difference between a request people answer and one they ignore is
// usually nothing more than a second email. Doing it by hand does not happen,
// so it happens here.
//
// Restrained on purpose, because the alternative is that Everstead becomes the
// thing your employer nags you through:
//   • nothing before it has been waiting three days;
//   • at most one nudge a week, and at most two ever;
//   • packs are nudged once as a pack, not once per item.
// After that it is a conversation for a human, not another email.
const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DAYS = (n) => new Date(Date.now() - n * 86400000).toISOString()
const MAX_PER_RUN = 200

async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  let nudged = 0, skipped = 0
  try {
    const { data: due } = await db.from('adviser_document_requests')
      .select('id, adviser_id, recipient_email, doc_type, note, expires_days, sender_name, reminded_at, reminder_count, pack_id, pack_name')
      .eq('status', 'requested')
      .lt('created_at', DAYS(3))
      .or(`reminded_at.is.null,reminded_at.lt.${DAYS(7)}`)
      .limit(MAX_PER_RUN)

    // One nudge per person per pack, listing everything still outstanding.
    const groups = new Map()
    for (const r of due || []) {
      if ((r.reminder_count || 0) >= 2) { skipped++; continue }
      const key = `${r.adviser_id}:${r.recipient_email}:${r.pack_id || r.id}`
      if (!groups.has(key)) groups.set(key, { rows: [], head: r })
      groups.get(key).rows.push(r)
    }

    for (const { rows, head } of groups.values()) {
      const { data: profile } = await db.from('profiles').select('language').ilike('email', head.recipient_email).maybeSingle()
      const ok = await sendOrgRequestEmail({
        to: head.recipient_email,
        lang: profile?.language === 'fr' ? 'fr' : 'en',
        firmName: head.sender_name,
        docTypes: rows.map(r => r.doc_type),
        note: head.note,
        expiresDays: head.expires_days,
        hasAccount: !!profile,
        packName: head.pack_name,
        reminder: true,
      })
      if (!ok) continue
      await db.from('adviser_document_requests').update({
        reminded_at: new Date().toISOString(),
        reminder_count: (head.reminder_count || 0) + 1,
        updated_at: new Date().toISOString(),
      }).in('id', rows.map(r => r.id))
      nudged += rows.length
    }
  } catch (err) {
    console.error('[cron/request-reminders]', err)
    captureException(err, { endpoint: 'cron/request-reminders' })
    return res.status(500).json({ error: 'Reminder run failed' })
  }

  return res.status(200).json({ nudged, skipped })
}

export default withSentry(handler)
