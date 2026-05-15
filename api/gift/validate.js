import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'Missing code' })
  const { data } = await supabase.from('gift_codes').select('plan, years, gifter_name, status, expires_at').eq('code', code).single()
  if (!data) return res.status(404).json({ error: 'Gift not found' })
  if (data.status === 'redeemed') return res.status(400).json({ error: 'Already redeemed' })
  if (data.status === 'expired' || new Date(data.expires_at) < new Date()) return res.status(400).json({ error: 'Expired' })
  return res.status(200).json({ plan: data.plan, years: data.years, gifterName: data.gifter_name, status: data.status })
}
