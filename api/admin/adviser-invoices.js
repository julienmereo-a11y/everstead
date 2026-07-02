import { requireAdmin, adminDb as db } from '../_lib/admin-auth.js'
import { withSentry } from '../lib/sentry.js'

// Admin-only invoice management for adviser firms. Amounts are pennies (GBP);
// a zero-value or 'waived' invoice cleanly records a free pilot.
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: 'Admin access required' })

  const { action } = req.body || {}

  try {
    // ── Invoices for one firm ────────────────────────────────────────────────
    if (action === 'list') {
      const { adviserId } = req.body
      if (!adviserId) return res.status(400).json({ error: 'Missing adviser id.' })
      const { data, error } = await db
        .from('invoices').select('*').eq('adviser_id', adviserId)
        .order('issue_date', { ascending: false })
      if (error) throw error
      return res.status(200).json({ invoices: data })
    }

    // ── Record a new invoice ─────────────────────────────────────────────────
    if (action === 'create') {
      const { invoice } = req.body
      if (!invoice?.adviser_id) return res.status(400).json({ error: 'Missing adviser id.' })
      const { data, error } = await db.from('invoices').insert(cleanInvoice(invoice)).select().single()
      if (error) throw error
      return res.status(200).json({ invoice: data })
    }

    // ── Update an invoice (status / details) ─────────────────────────────────
    if (action === 'update') {
      const { id, invoice } = req.body
      if (!id) return res.status(400).json({ error: 'Missing invoice id.' })
      const { data, error } = await db
        .from('invoices').update({ ...cleanInvoice(invoice), updated_at: new Date().toISOString() })
        .eq('id', id).select().single()
      if (error) throw error
      return res.status(200).json({ invoice: data })
    }

    // ── Signed URL for a private invoice PDF (admins only) ───────────────────
    if (action === 'file-url') {
      const { filePath } = req.body
      if (!filePath) return res.status(400).json({ error: 'Missing file path.' })
      const { data, error } = await db.storage
        .from('adviser-invoices').createSignedUrl(filePath, 300)
      if (error) throw error
      return res.status(200).json({ url: data.signedUrl })
    }

    return res.status(400).json({ error: `Unknown action: ${action}` })
  } catch (err) {
    console.error('admin/adviser-invoices error:', err)
    return res.status(500).json({ error: err.message })
  }
}

function cleanInvoice(inv = {}) {
  const allowed = ['adviser_id', 'amount', 'currency', 'issue_date', 'due_date', 'status', 'file_path', 'notes']
  const out = {}
  for (const k of allowed) if (inv[k] !== undefined) out[k] = inv[k]
  if (out.amount !== undefined && out.amount !== null && out.amount !== '') out.amount = Math.max(0, Math.floor(Number(out.amount)) || 0)
  if (out.due_date === '') out.due_date = null
  return out
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
