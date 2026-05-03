import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId } = req.body
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!userId || !token) return res.status(400).json({ error: 'Missing fields' })

  // Verify the token belongs to the user being deleted
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user || user.id !== userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) {
    console.error('delete-account error:', error)
    return res.status(500).json({ error: error.message })
  }

  res.status(200).json({ deleted: true })
}
