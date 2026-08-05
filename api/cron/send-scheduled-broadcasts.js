import { adminDb as db } from '../_lib/admin-auth.js'
import { SENDERS, resolveAudience, sendToRecipients } from '../_lib/broadcast.js'
import { withSentry, captureException } from '../lib/sentry.js'

// ─────────────────────────────────────────────────────────────────────────────
// Delivers admin broadcasts scheduled from the panel (status='scheduled' rows in
// admin_broadcasts whose scheduled_at has passed). Runs every 10 minutes — a
// 09:00 schedule goes out by ~09:10.
//
// Each due row is CLAIMED first (status scheduled → sending, guarded by the
// previous status) so an overlapping cron run can never double-send it. The
// audience is resolved fresh at send time — users who joined after scheduling
// are included, deleted/unsubscribed users are not. Uses the same shared
// machinery as an immediate send (api/_lib/broadcast.js).
// ─────────────────────────────────────────────────────────────────────────────

async function handler(req, res) {
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // A 401 on a genuine Vercel cron invocation means CRON_SECRET is misconfigured
    // (missing, stale, or drifted) — exactly what silently killed EVERY cron until
    // 2026-08-05. Make it loud in Sentry instead of an invisible 401. Diagnostics
    // are presence/length only — never the secret itself.
    const ua = req.headers['user-agent'] || ''
    const expected = process.env.CRON_SECRET
    const diag = {
      ua,
      hasAuthHeader: authHeader != null,
      authHeaderLen: authHeader?.length ?? 0,
      hasEnvSecret: expected != null,
      envSecretLen: expected?.length ?? 0,
    }
    console.log('cron-auth-diag', JSON.stringify(diag))
    if (ua.startsWith('vercel-cron')) {
      captureException(new Error('CRON_SECRET mismatch — scheduled jobs are being rejected'), {
        endpoint: 'cron/send-scheduled-broadcasts', ...diag,
      })
    }
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: due, error } = await db.from('admin_broadcasts')
    .select('id, audience, sender, subject, message, respect_marketing_prefs, audience_emails')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(5) // a run handles at most 5 broadcasts; the next run picks up the rest
  if (error) {
    captureException(new Error(error.message), { endpoint: 'cron/send-scheduled-broadcasts', stage: 'query' })
    return res.status(500).json({ error: error.message })
  }
  if (!due?.length) return res.status(200).json({ sent: 0 })

  const results = []
  for (const row of due) {
    // Atomic claim — only proceed if we flipped it from 'scheduled' ourselves.
    const { data: claimed } = await db.from('admin_broadcasts')
      .update({ status: 'sending' })
      .eq('id', row.id)
      .eq('status', 'scheduled')
      .select('id')
    if (!claimed?.length) continue

    try {
      // Old rows may hold the full From string rather than the allowlist key.
      const from = SENDERS[row.sender] || Object.values(SENDERS).find(v => v === row.sender) || SENDERS.hello
      const recipients = await resolveAudience({
        audience: row.audience,
        emails: row.audience_emails ?? [],
        respectMarketingPrefs: row.respect_marketing_prefs !== false,
      })
      const { sent, failed } = await sendToRecipients({
        recipients,
        from,
        subject: row.subject,
        message: row.message,
        onChunkError: (err, offset) => captureException(err, { endpoint: 'cron/send-scheduled-broadcasts', stage: 'batch', id: row.id, offset }),
      })
      await db.from('admin_broadcasts')
        .update({ status: 'sent', recipient_count: sent, failed_count: failed, sent_at: new Date().toISOString() })
        .eq('id', row.id)
      results.push({ id: row.id, sent, failed })
    } catch (err) {
      // Mark failed rather than leaving it stuck in 'sending' — visible in the panel.
      // (try/catch, not .catch(): a PostgREST builder is a thenable without .catch.)
      captureException(err, { endpoint: 'cron/send-scheduled-broadcasts', id: row.id })
      try { await db.from('admin_broadcasts').update({ status: 'failed' }).eq('id', row.id) } catch { /* non-fatal */ }
      results.push({ id: row.id, error: err.message })
    }
  }

  console.log('send-scheduled-broadcasts:', results)
  return res.status(200).json({ processed: results.length, results })
}

export default withSentry(handler)
