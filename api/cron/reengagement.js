import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend  = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

// Re-engagement nudge for low-progress users.
//
// Fires weekly (Mondays 10:00 UTC via vercel.json cron).
// Targets users who:
//   - Completed checkout (have a stripe_subscription_id)
//   - Are 7+ days into their trial
//   - Have a low readiness score: fewer than 2 of the 3 core actions done
//     (add an account, invite a trusted contact, upload a document)
//   - Have not yet received a re-engagement nudge (or it was sent 14+ days ago)
//
// The email is personalised to highlight specifically what's missing.

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now               = new Date()
  const sevenDaysAgo      = new Date(now.getTime() - 7  * 86_400_000).toISOString()
  const fourteenDaysAgo   = new Date(now.getTime() - 14 * 86_400_000).toISOString()

  // Fetch candidates: trialing/active users, signed up 7+ days ago,
  // not nudged yet or last nudge was 14+ days ago
  const { data: candidates, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, plan')
    .not('stripe_subscription_id', 'is', null)
    .in('subscription_status', ['trialing', 'active'])
    .neq('role', 'delegate')
    .not('email', 'is', null)
    .lte('created_at', sevenDaysAgo)
    .or(`reengagement_nudge_sent_at.is.null,reengagement_nudge_sent_at.lte.${fourteenDaysAgo}`)

  if (error) {
    console.error('reengagement query error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!candidates?.length) {
    return res.status(200).json({ sent: 0 })
  }

  let sent = 0
  const errors = []

  for (const user of candidates) {
    try {
      // Check which core actions the user has completed
      const [
        { count: accountCount },
        { count: contactCount },
        { count: documentCount },
      ] = await Promise.all([
        supabase.from('accounts')      .select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('trusted_people').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('documents')     .select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      const hasAccounts  = (accountCount  ?? 0) > 0
      const hasContacts  = (contactCount  ?? 0) > 0
      const hasDocuments = (documentCount ?? 0) > 0
      const score        = [hasAccounts, hasContacts, hasDocuments].filter(Boolean).length

      // Only nudge if readiness score is low (fewer than 2 of 3 done)
      if (score >= 2) continue

      const missing = [
        !hasAccounts  && 'accounts',
        !hasContacts  && 'contacts',
        !hasDocuments && 'documents',
      ].filter(Boolean)

      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      user.email,
        subject: nudgeSubject(missing),
        html:    nudgeHtml(user.full_name, user.plan, hasAccounts, hasContacts, hasDocuments),
      })

      await supabase
        .from('profiles')
        .update({ reengagement_nudge_sent_at: now.toISOString() })
        .eq('id', user.id)

      sent++
    } catch (err) {
      console.error(`reengagement error for ${user.email}:`, err)
      errors.push(`${user.id}: ${err.message}`)
    }
  }

  console.log('reengagement:', { sent, errors })
  return res.status(200).json({ sent, total: candidates.length, errors })
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic subject based on what's missing
// ─────────────────────────────────────────────────────────────────────────────
function nudgeSubject(missing) {
  if (missing.includes('contacts') && missing.includes('accounts')) {
    return 'Your Everstead plan is still empty — let\'s fix that'
  }
  if (missing.includes('contacts')) {
    return 'One thing missing from your Everstead plan'
  }
  if (missing.includes('accounts')) {
    return 'Your financial accounts aren\'t in Everstead yet'
  }
  return 'Your estate plan is almost complete'
}

// ─────────────────────────────────────────────────────────────────────────────
// Personalised nudge email
// ─────────────────────────────────────────────────────────────────────────────
function nudgeHtml(name, plan, hasAccounts, hasContacts, hasDocuments) {
  const first    = name?.split(' ')[0] || 'there'
  const planName = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Essential'

  // Build a checklist showing what's done and what's missing
  const checklistItems = [
    {
      done:  hasAccounts,
      icon:  hasAccounts ? '✅' : '⬜',
      label: hasAccounts
        ? 'Financial accounts added'
        : '<strong>Add a financial account</strong> — bank, pension, investment, or property',
      href:  `${APP_URL}/dashboard`,
    },
    {
      done:  hasContacts,
      icon:  hasContacts ? '✅' : '⬜',
      label: hasContacts
        ? 'Trusted contact invited'
        : '<strong>Invite a trusted contact</strong> — someone who should have access to your plan',
      href:  `${APP_URL}/dashboard`,
    },
    {
      done:  hasDocuments,
      icon:  hasDocuments ? '✅' : '⬜',
      label: hasDocuments
        ? 'Document uploaded to your vault'
        : '<strong>Upload a document</strong> — your will, passport, pension statement',
      href:  `${APP_URL}/dashboard`,
    },
  ]

  const checklistRows = checklistItems.map(item => `
    <tr>
      <td style="padding:10px 14px;vertical-align:top;font-size:18px;line-height:1;">${item.icon}</td>
      <td style="padding:10px 0;color:${item.done ? '#6b7280' : '#1a202c'};font-size:14px;line-height:1.6;${item.done ? 'text-decoration:line-through;' : ''}">${item.label}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#0d1628;padding:28px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
            ${first}, your plan is almost ready.
          </h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            You signed up for Everstead's <strong>${planName}</strong> plan — great first step. A few things left to make your estate plan genuinely useful if something unexpected happens:
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:24px 0 32px;width:100%;background:#f9f8f6;border-radius:10px;padding:8px;">
            ${checklistRows}
          </table>
          <a href="${APP_URL}/dashboard"
             style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">
            Continue my plan →
          </a>
          <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">
            — Julien, founder of Everstead
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            Questions? Reply to this email or write to <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a>
            · <a href="mailto:hello@everstead.care?subject=Unsubscribe" style="color:#9ca3af;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
