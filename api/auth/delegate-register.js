import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password, name, mode } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' })

  if (mode === 'register') {
    // Create user server-side (bypasses captcha). Auto-confirm email — delegates
    // don't go through the normal email confirmation flow.
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: name ?? email, role: 'delegate' },
      email_confirm: true,
    })
    if (createErr) return res.status(400).json({ error: createErr.message })

    // Mark profile as delegate (trigger creates it as 'user' by default)
    if (created?.user?.id) {
      await supabase.from('profiles').update({ role: 'delegate' }).eq('id', created.user.id)
    }
  }

  // Sign in server-side with service role key to bypass captcha, return session tokens
  const authRes = await fetch(
    `${process.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    }
  )

  if (!authRes.ok) {
    const err = await authRes.json().catch(() => ({}))
    return res.status(401).json({ error: err.error_description || 'Invalid email or password' })
  }

  const { access_token, refresh_token } = await authRes.json()
  res.status(200).json({ access_token, refresh_token })
}
