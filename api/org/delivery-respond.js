// POST /api/org/delivery-respond
//
// The recipient's half of a delivery: accept it into your own vault, or decline
// it. This is the moment the promise on the business site becomes literally
// true, so the order matters.
//
//   accept  → copy the staged object into the member's own documents bucket,
//             create a documents row THEY own (source = 'delivery', so it never
//             eats into the free plan's five), then clear the staging object.
//             The organisation keeps a row saying it was accepted and has no
//             read path to the document from that moment on.
//   decline → clear the staging object, keep the row as declined.
//
// Service role throughout: it moves storage objects between two private
// buckets, binds a delivery that arrived before the recipient had an account,
// and writes a document row that bypasses the free-tier insert policy on
// purpose.
import { createClient } from '@supabase/supabase-js'
import { withSentry, captureException } from '../_lib/sentry.js'
import { rateLimited } from '../_lib/rate-limit.js'
import { ensureConnection, fileDeliveryIntoVault } from '../_lib/deliveries.js'

const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const clearStaging = (path) => db.storage.from('deliveries').remove([path]).catch(() => {})

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!bearer) return res.status(401).json({ error: 'Unauthorized' })
  const { data: { user }, error: authError } = await db.auth.getUser(bearer)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  if (await rateLimited(req, 'delivery-respond', { max: 30, windowMinutes: 10 })) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a few minutes.' })
  }

  const { deliveryId, action } = req.body || {}
  const claimToken = typeof req.body?.claimToken === 'string' ? req.body.claimToken : null
  if (!['accept', 'decline'].includes(action)) return res.status(400).json({ error: 'Unknown action.' })
  if (!deliveryId && !claimToken) return res.status(400).json({ error: 'Missing delivery.' })
  if (deliveryId && !UUID.test(deliveryId)) return res.status(400).json({ error: 'Missing delivery.' })

  const query = db.from('inbound_deliveries').select('*')
  const { data: delivery } = deliveryId
    ? await query.eq('id', deliveryId).maybeSingle()
    : await query.eq('claim_token', claimToken).maybeSingle()
  if (!delivery) return res.status(404).json({ error: 'That delivery no longer exists.' })

  // Three ways this delivery can be yours: it is already bound to you, it was
  // sent to your address, or you hold the claim token from the email.
  const email = (user.email || '').toLowerCase()
  const mine =
    delivery.member_id === user.id ||
    (delivery.recipient_email || '').toLowerCase() === email ||
    (!!claimToken && claimToken === delivery.claim_token)
  if (!mine) return res.status(403).json({ error: 'That delivery was sent to someone else.' })

  if (delivery.status !== 'sent') return res.status(409).json({ error: 'You have already answered this one.', status: delivery.status })
  if (delivery.expires_at && new Date(delivery.expires_at) < new Date()) {
    await db.from('inbound_deliveries').update({ status: 'expired', responded_at: new Date().toISOString() }).eq('id', delivery.id)
    await clearStaging(delivery.storage_path)
    return res.status(410).json({ error: 'This delivery has expired. Ask the sender to send it again.' })
  }

  const now = new Date().toISOString()

  if (action === 'decline') {
    const { data: updated } = await db.from('inbound_deliveries')
      .update({ status: 'declined', responded_at: now, member_id: user.id, claim_token: null })
      .eq('id', delivery.id).select('id, status').single()
    await clearStaging(delivery.storage_path)
    return res.status(200).json({ delivery: updated })
  }

  // ── Accept ────────────────────────────────────────────────────────────────
  try {
    const { error: fileErr, documentId } = await fileDeliveryIntoVault(db, delivery, user.id)
    if (fileErr) return res.status(502).json({ error: `${fileErr} Ask the sender to send it again.` })

    // Accepting IS the consent to the organisation. From here their deliveries
    // file themselves, which is the whole point of accepting once.
    await ensureConnection(db, user.id, delivery.org_id)

    await db.from('activity_log').insert({
      user_id: user.id, actor_id: user.id,
      action: 'document.delivered_accepted', resource_type: 'documents',
      resource_id: documentId, resource_name: delivery.title,
      metadata: { org_id: delivery.org_id, delivery_id: delivery.id },
    })

    return res.status(200).json({ delivery: { id: delivery.id, status: 'accepted', document_id: documentId }, documentId })
  } catch (err) {
    console.error('[org/delivery-respond] accept failed:', err)
    captureException(err, { endpoint: 'org/delivery-respond', stage: 'accept' })
    return res.status(500).json({ error: 'Could not accept this document. Please try again.' })
  }
}

export default withSentry(handler)
