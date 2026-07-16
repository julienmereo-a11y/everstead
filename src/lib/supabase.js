import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnon) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Get a signed URL for a private document (expires in 1 hour) */
export async function getDocumentUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 3600)
  if (error) throw error
  return data.signedUrl
}

/** Upload a document file, returns the storage path */
export async function uploadDocument(userId, documentId, file) {
  const ext  = file.name.split('.').pop()
  const path = `${userId}/${documentId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('documents')
    .upload(path, file, { upsert: true })
  if (error) throw error
  return path
}

/** Remove a file from storage by its path (best-effort, does not throw) */
export async function removeStorageFile(storagePath) {
  if (!storagePath) return
  await supabase.storage.from('documents').remove([storagePath]).catch(() => {})
}

/**
 * Send an enquiry email to sales@everstead.care via a Supabase Edge Function.
 * Falls back to a mailto: link if the function is not yet deployed.
 *
 * @param {'book-demo'|'contact'} type
 * @param {Record<string, string>} fields  All form fields
 */
export async function sendEnquiry(type, fields) {
  const res = await fetch('/api/contact/enquiry', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ type, fields }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to send enquiry')
  }
}

/** Log an activity event (fire-and-forget) */
export function logActivity(userId, action, resourceType, resourceId, resourceName, metadata = {}) {
  supabase.from('activity_log').insert({
    user_id: userId,
    actor_id: userId, // self-action: the acting user owns the row
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    resource_name: resourceName,
    metadata,
  }).then(() => {}) // intentionally not awaited
}

/**
 * Signed URL for a Personal Message's photo/video.
 *
 * Message media lives in the PRIVATE `messages` bucket (sealed content must not
 * be fetchable by anyone holding a leaked URL). Rows store the original
 * public-style URL — it encodes the object path — so we extract the path and
 * mint a short-lived signed URL. The owner's storage SELECT policy scopes this
 * to their own folder; delegates and external recipients get theirs from the
 * server (api/messages/delegate-media.js and /m/<token> respectively).
 *
 * Returns null when there's nothing to sign or the caller isn't allowed.
 */
export async function signedMessageMediaUrl(storedUrl, expiresIn = 3600) {
  if (!storedUrl) return null
  const m = String(storedUrl).match(/\/object\/(?:public|sign)\/messages\/([^?]+)/)
    || String(storedUrl).match(/\/messages\/([^?]+)/)
  const path = m ? decodeURIComponent(m[1]) : String(storedUrl)
  const { data, error } = await supabase.storage.from('messages').createSignedUrl(path, expiresIn)
  if (error) return null
  return data?.signedUrl || null
}
