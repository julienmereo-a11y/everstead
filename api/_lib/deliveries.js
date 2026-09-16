// Filing a delivered document into the recipient's own vault.
//
// Shared by two callers that must behave identically, because the difference
// between them is only WHO decided:
//   • api/org/delivery-respond.js — the recipient pressed Accept;
//   • api/org/deliver.js — they had already accepted this organisation once,
//     so later deliveries file themselves.
//
// The one-accept-per-organisation rule is the whole design. A blanket
// auto-file would let any verified organisation drop files into a stranger's
// vault, which is the abuse the accept step exists to stop. Accepting once is
// the consent, and it opens the connection; from then on it behaves like a
// payslip arriving in a coffre-fort, and the member can switch it off per
// organisation from Who has access.

/** Is this organisation already allowed to file straight into this vault? */
export async function autoFileAllowed(db, memberId, orgId) {
  if (!memberId || !orgId) return false
  const { data } = await db
    .from('member_connections')
    .select('status, auto_file')
    .eq('member_id', memberId).eq('org_id', orgId)
    .maybeSingle()
  return !!data && data.status === 'active' && data.auto_file !== false
}

/** Accepting a delivery is also the moment the member connects to the sender. */
export async function ensureConnection(db, memberId, orgId) {
  const { data: org } = await db.from('advisers').select('org_kind').eq('id', orgId).maybeSingle()
  await db.from('member_connections').upsert({
    member_id: memberId,
    org_id: orgId,
    kind: org?.org_kind === 'employer' ? 'employer' : 'professional',
    status: 'active',
    ended_at: null,
  }, { onConflict: 'member_id,org_id' })
}

/**
 * Copy the staged file into the member's own storage, create the document row
 * they own, mark the delivery accepted and clear staging.
 *
 * Returns { documentId } or { error } — never throws, because both callers have
 * their own idea of what to say when it fails.
 */
export async function fileDeliveryIntoVault(db, delivery, memberId) {
  const { data: blob, error: dlErr } = await db.storage.from('deliveries').download(delivery.storage_path)
  if (dlErr || !blob) return { error: 'The file could not be read.' }
  const bytes = Buffer.from(await blob.arrayBuffer())

  // The row comes first so the storage path can follow the same
  // <user>/<document>/<timestamp> convention every other document uses.
  const { data: doc, error: docErr } = await db.from('documents').insert({
    user_id:   memberId,
    name:      delivery.title,
    doc_type:  delivery.doc_type || 'Other',
    status:    'current',
    source:    'delivery',
    notes:     delivery.note || null,
    mime_type: delivery.mime_type || blob.type || null,
    file_size: delivery.file_size ?? bytes.length,
  }).select('id').single()
  if (docErr || !doc) {
    console.error('[deliveries] document insert failed:', docErr)
    return { error: 'Could not add the document to the vault.' }
  }

  const ext  = (delivery.storage_path.split('.').pop() || 'bin').slice(0, 10)
  const path = `${memberId}/${doc.id}/${Date.now()}.${ext}`
  const { error: upErr } = await db.storage.from('documents').upload(path, bytes, {
    contentType: delivery.mime_type || blob.type || 'application/octet-stream',
    upsert: true,
  })
  if (upErr) {
    await db.from('documents').delete().eq('id', doc.id)
    console.error('[deliveries] upload failed:', upErr)
    return { error: 'Could not save the file to the vault.' }
  }

  const now = new Date().toISOString()
  await db.from('documents').update({ storage_path: path }).eq('id', doc.id)
  await db.from('inbound_deliveries').update({
    status: 'accepted', responded_at: now, member_id: memberId,
    document_id: doc.id, claim_token: null, claim_code_hash: null,
  }).eq('id', delivery.id)
  await db.storage.from('deliveries').remove([delivery.storage_path]).catch(() => {})

  return { documentId: doc.id }
}
