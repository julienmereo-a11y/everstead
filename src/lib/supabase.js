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
  // Build a plain-text summary of all fields
  const lines = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  try {
    const { error } = await supabase.functions.invoke('send-enquiry', {
      body: { type, fields, to: 'sales@everstead.care' },
    })
    if (error) throw error
  } catch {
    // Edge function not deployed yet — open mailto as reliable fallback
    const subject = encodeURIComponent(
      type === 'book-demo'
        ? `[Book Demo] ${fields.firm || fields.name || 'New request'}`
        : `[Contact] ${fields.subject || 'New message'}`
    )
    const body = encodeURIComponent(lines)
    window.open(`mailto:sales@everstead.care?subject=${subject}&body=${body}`)
  }
}

/** Log an activity event (fire-and-forget) */
export function logActivity(userId, action, resourceType, resourceId, resourceName, metadata = {}) {
  supabase.from('activity_log').insert({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    resource_name: resourceName,
    metadata,
  }).then(() => {}) // intentionally not awaited
}
