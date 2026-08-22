import { requireAdmin, adminDb as db } from '../_lib/admin-auth.js'
import { SENDERS, AUDIENCES, firstName, resolveAudience, sendToRecipients, sendTestEmail } from '../_lib/broadcast.js'
import { withSentry, captureException } from '../lib/sentry.js'

// ─────────────────────────────────────────────────────────────────────────────
// Admin-only: broadcast an email to all users or a specific group.
//
// POST { mode, audience, emails?, subject, message, respectMarketingPrefs,
//        sender, scheduledAt?, id? }
//   mode 'preview' → resolve the audience and return { count, sample } only.
//   mode 'test'    → send the composed email to the CALLING ADMIN only.
//   mode 'send'    → without scheduledAt: send now to the resolved audience and
//                    audit to admin_broadcasts (status 'sent').
//                    WITH scheduledAt (ISO 8601, future): store the broadcast as
//                    status 'scheduled' — api/cron/send-scheduled-broadcasts.js
//                    delivers it when due. The audience is re-resolved AT SEND
//                    TIME, so people who join before then are included.
//   mode 'list'    → recent broadcasts (scheduled first) for the panel.
//   mode 'cancel'  → { id }: cancel a still-scheduled broadcast.
//
// Audience/rendering semantics live in api/_lib/broadcast.js (shared with the
// cron): server-side resolution, marketing-unsubscribe respect, suspended-account
// exclusion, dedupe, {{name}} personalisation, URL auto-linking.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_SCHEDULE_DAYS = 60

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const {
    mode = 'preview',
    audience,
    emails,
    subject = '',
    message = '',
    respectMarketingPrefs = true,
    sender = 'hello',
    scheduledAt = null,
    id = null,
  } = req.body ?? {}

  try {
    if (mode === 'list') {
      const { data, error } = await db.from('admin_broadcasts')
        .select('id, audience, sender, subject, status, scheduled_at, sent_at, recipient_count, failed_count, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw new Error(error.message)
      return res.status(200).json({ broadcasts: data ?? [] })
    }

    if (mode === 'cancel') {
      if (!id) return res.status(400).json({ error: 'Missing id' })
      // Only a still-scheduled row can be cancelled — once 'sending'/'sent' it's gone.
      const { data, error } = await db.from('admin_broadcasts')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('status', 'scheduled')
        .select('id')
      if (error) throw new Error(error.message)
      if (!data?.length) return res.status(409).json({ error: 'Too late, this broadcast is no longer scheduled.' })
      return res.status(200).json({ cancelled: true })
    }

    if (!AUDIENCES.has(audience)) return res.status(400).json({ error: 'Unknown audience' })
    const from = SENDERS[sender]
    if (!from) return res.status(400).json({ error: 'Unknown sender' })
    if (mode !== 'preview' && (!subject.trim() || !message.trim())) {
      return res.status(400).json({ error: 'Subject and message are required' })
    }

    const recipients = await resolveAudience({ audience, emails, respectMarketingPrefs })

    if (mode === 'preview') {
      return res.status(200).json({
        count: recipients.length,
        sample: recipients.slice(0, 5).map(u => u.email),
      })
    }

    if (mode === 'test') {
      const name = firstName((await db.from('profiles').select('full_name').eq('id', admin.id).maybeSingle()).data?.full_name)
      await sendTestEmail({ to: admin.email, name, from, subject, message })
      return res.status(200).json({ test: true, to: admin.email })
    }

    // mode === 'send'
    if (recipients.length === 0) return res.status(400).json({ error: 'No recipients match this audience' })

    if (scheduledAt) {
      const when = new Date(scheduledAt)
      if (Number.isNaN(when.getTime())) return res.status(400).json({ error: 'Invalid schedule time' })
      if (when.getTime() < Date.now() - 60_000) return res.status(400).json({ error: 'Schedule time is in the past' })
      if (when.getTime() > Date.now() + MAX_SCHEDULE_DAYS * 86_400_000) {
        return res.status(400).json({ error: `Schedule at most ${MAX_SCHEDULE_DAYS} days ahead` })
      }
      const { data, error } = await db.from('admin_broadcasts').insert({
        sent_by: admin.id,
        audience,
        sender,
        subject,
        message,
        respect_marketing_prefs: respectMarketingPrefs,
        audience_emails: audience === 'emails' ? (emails ?? []) : null,
        status: 'scheduled',
        scheduled_at: when.toISOString(),
      }).select('id').single()
      if (error) throw new Error(error.message)
      // recipient count is indicative only — the audience re-resolves at send time.
      return res.status(200).json({ scheduled: true, id: data.id, at: when.toISOString(), estimatedCount: recipients.length })
    }

    const { sent, failed } = await sendToRecipients({
      recipients, from, subject, message,
      runId: crypto.randomUUID(), // idempotency base, a retried batch can't double-send
      onChunkError: (err, offset) => captureException(err, { endpoint: 'admin/broadcast-email', stage: 'batch', offset }),
    })

    await db.from('admin_broadcasts').insert({
      sent_by: admin.id,
      audience,
      sender,
      subject,
      message,
      recipient_count: sent,
      failed_count: failed,
      respect_marketing_prefs: respectMarketingPrefs,
      audience_emails: audience === 'emails' ? (emails ?? []) : null,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    return res.status(200).json({ sent, failed, total: recipients.length })
  } catch (err) {
    console.error('broadcast-email error:', err)
    captureException(err, { endpoint: 'admin/broadcast-email' })
    return res.status(500).json({ error: err.message || 'Broadcast failed' })
  }
}

export default withSentry(handler)
