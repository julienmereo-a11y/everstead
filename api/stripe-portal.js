import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { withSentry, captureException } from './lib/sentry.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify caller is authenticated
  const authHeader = req.headers.authorization ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' })

  // Look up the authenticated user's Stripe customer ID — never trust the client's value
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  const customerId = profile?.stripe_customer_id
  if (!customerId) return res.status(400).json({ error: 'No billing account found' })

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${process.env.VITE_APP_URL}/dashboard`,
    })
    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('stripe-portal error:', err)
    captureException(err, { endpoint: 'stripe-portal' })
    res.status(500).json({ error: err.message })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
