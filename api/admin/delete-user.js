import Stripe from 'stripe'
import { requireAdmin, adminDb as db } from '../_lib/admin-auth.js'
import { withSentry, captureException } from '../lib/sentry.js'

// ─────────────────────────────────────────────────────────────────────────────
// Admin-only: permanently delete a user. Instant + irreversible.
//
// What it removes, and how:
//   • Stripe        — cancels the active subscription and deletes the customer
//                     (which also removes their saved card and cancels any subs).
//   • Storage       — every file under `${userId}/` in the documents, messages,
//                     and avatars buckets (that's the path convention everywhere).
//   • Database      — deletes the auth.users row. profiles.id → auth.users is
//                     ON DELETE CASCADE, and every owned table cascades from
//                     profiles, so accounts, documents, messages, alerts,
//                     instructions, wishes, trusted_people, access_grants,
//                     about_me, known_devices, activity_log, delegate_sessions,
//                     adviser_client_notes, subscriptions all go with it.
//   • Email-keyed   — marketing_leads / subprocessor subscribers / mfa_pending
//                     rows keyed by the user's email (no FK, so cleared here).
//
// Four foreign keys onto the user are NO ACTION and would otherwise block the
// cascade — they're detached first: activity_log.actor_id, admin_invites.accepted_by
// and gift_codes.redeemed_by are nulled; family_memberships rows are deleted.
// (reports.owner_id and adviser_client_invites.invited_by are SET NULL, so the
// database handles those automatically.)
//
// Guards: an admin can't delete themselves, and can't delete another admin
// (demote them first). Stripe / storage failures are collected as non-fatal
// warnings so a payment-side hiccup never leaves a half-deleted account behind.
// ─────────────────────────────────────────────────────────────────────────────

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const USER_BUCKETS = ['documents', 'messages', 'avatars']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Remove every object under `${uid}/` in a bucket. Paths are `${uid}/<sub>/<file>`
// (documents, messages) or `${uid}/<file>` (avatars), so we list one level deep.
// Best-effort: any failure is recorded as a warning, never thrown.
async function removeUserFolder(bucket, uid, warnings) {
  try {
    const { data: top, error } = await db.storage.from(bucket).list(uid, { limit: 1000 })
    if (error) { warnings.push(`storage:${bucket}: ${error.message}`); return }
    if (!top || top.length === 0) return

    const paths = []
    for (const entry of top) {
      if (entry.id === null) {
        // A sub-folder (documentId / messageId) — list and collect its files.
        const sub = `${uid}/${entry.name}`
        const { data: files } = await db.storage.from(bucket).list(sub, { limit: 1000 })
        for (const f of files || []) paths.push(`${sub}/${f.name}`)
      } else {
        paths.push(`${uid}/${entry.name}`)
      }
    }
    if (paths.length) {
      const { error: rmErr } = await db.storage.from(bucket).remove(paths)
      if (rmErr) warnings.push(`storage:${bucket}: ${rmErr.message}`)
    }
  } catch (e) {
    warnings.push(`storage:${bucket}: ${e.message}`)
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const { userId, reason } = req.body || {}
  if (!userId || !UUID_RE.test(userId)) return res.status(400).json({ error: 'A valid user id is required.' })
  if (userId === admin.id) return res.status(400).json({ error: 'You cannot delete your own admin account.' })

  // Load the profile (may be absent for an auth user with no profile row — still deletable).
  const { data: prof } = await db
    .from('profiles')
    .select('id, email, full_name, role, stripe_customer_id, stripe_subscription_id')
    .eq('id', userId)
    .maybeSingle()

  if (prof?.role === 'admin') {
    return res.status(403).json({ error: 'This user is an admin. Remove their admin role before deleting them.' })
  }

  const warnings = []

  // 1. Stripe — cancel the subscription, then delete the customer (removes card + cancels subs).
  try {
    if (prof?.stripe_subscription_id) {
      try { await stripe.subscriptions.cancel(prof.stripe_subscription_id) }
      catch (e) { if (e?.code !== 'resource_missing') warnings.push(`stripe:sub: ${e.message}`) }
    }
    if (prof?.stripe_customer_id) {
      try { await stripe.customers.del(prof.stripe_customer_id) }
      catch (e) { if (e?.code !== 'resource_missing') warnings.push(`stripe:customer: ${e.message}`) }
    }
  } catch (e) {
    warnings.push(`stripe: ${e.message}`)
    captureException(e, { endpoint: 'admin/delete-user', stage: 'stripe', userId })
  }

  // 2. Storage — remove all of the user's files across the three buckets.
  for (const bucket of USER_BUCKETS) await removeUserFolder(bucket, userId, warnings)

  // 3. Detach the NO ACTION foreign keys so the cascade delete can proceed. These
  //    resolve with { error } rather than throwing, so we check each explicitly.
  const blockerOps = [
    db.from('activity_log').update({ actor_id: null }).eq('actor_id', userId),
    db.from('admin_invites').update({ accepted_by: null }).eq('accepted_by', userId),
    db.from('gift_codes').update({ redeemed_by: null }).eq('redeemed_by', userId),
    db.from('family_memberships').delete().or(`primary_user_id.eq.${userId},secondary_user_id.eq.${userId}`),
  ]
  for (const op of blockerOps) {
    const { error } = await op
    if (error) {
      captureException(error, { endpoint: 'admin/delete-user', stage: 'blockers', userId })
      return res.status(500).json({ error: `Could not detach references before deletion: ${error.message}` })
    }
  }

  // 4. Email-keyed PII the user owns (no FK, so it won't cascade).
  if (prof?.email) {
    await db.from('marketing_leads').delete().eq('email', prof.email)
    await db.from('subprocessor_notification_subscribers').delete().eq('email', prof.email)
    await db.from('mfa_pending').delete().eq('email', prof.email)
  }

  // 5. Delete the auth user → cascades profiles and every owned table.
  const { error: delErr } = await db.auth.admin.deleteUser(userId)
  if (delErr) {
    captureException(delErr, { endpoint: 'admin/delete-user', stage: 'auth-delete', userId })
    return res.status(500).json({ error: `Could not delete the account: ${delErr.message}` })
  }

  // 6. Audit trail (no FK to the now-deleted user, so this is safe).
  await db.from('deletion_log').insert({
    user_id:         userId,
    deleted_at:      new Date().toISOString(),
    deletion_reason: `admin:${admin.email}${reason ? `:${String(reason).slice(0, 200)}` : ''}`,
  })

  return res.status(200).json({ ok: true, warnings })
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
