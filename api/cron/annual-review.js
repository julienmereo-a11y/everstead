import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend  = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

// ─────────────────────────────────────────────────────────────────────────────
// Annual Review Ritual
//
// Fires on the 1st of each month at 09:00 UTC (vercel.json: "0 9 1 * *").
// Targets users who are approximately at their one-year anniversary:
//   - subscription_status IN ('trialing', 'active')
//   - created_at between 11.5 and 12.5 months ago
//   - annual_review_sent_at IS NULL or was sent more than 11 months ago
//
// Sends a personalised review prompt and updates annual_review_sent_at.
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now              = new Date()
  // Anniversary window: created between 11.5 and 12.5 months ago
  const windowStart      = new Date(now.getTime() - Math.round(12.5 * 30.44 * 86_400_000)).toISOString()
  const windowEnd        = new Date(now.getTime() - Math.round(11.5 * 30.44 * 86_400_000)).toISOString()
  // Prevent re-sending if we already sent within the last 11 months
  const elevenMonthsAgo  = new Date(now.getTime() - Math.round(11 * 30.44 * 86_400_000)).toISOString()

  const { data: candidates, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, plan, notify_annual_review')
    .in('subscription_status', ['trialing', 'active'])
    .neq('role', 'delegate')
    .not('email', 'is', null)
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd)
    .or(`annual_review_sent_at.is.null,annual_review_sent_at.lte.${elevenMonthsAgo}`)
    .neq('notify_annual_review', false)

  if (error) {
    console.error('annual-review query error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!candidates?.length) {
    return res.status(200).json({ sent: 0 })
  }

  let sent = 0
  const errors = []

  for (const user of candidates) {
    try {
      // Count their vault items for personalisation
      const [
        { count: accountCount },
        { count: documentCount },
        { count: contactCount },
      ] = await Promise.all([
        supabase.from('accounts')      .select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('documents')     .select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('trusted_people').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      user.email,
        subject: "It's been a year — is your Everstead plan still accurate?",
        html:    annualReviewHtml(user.full_name, user.plan, accountCount ?? 0, documentCount ?? 0, contactCount ?? 0),
      })

      await supabase
        .from('profiles')
        .update({ annual_review_sent_at: now.toISOString() })
        .eq('id', user.id)

      sent++
    } catch (err) {
      console.error(`annual-review error for ${user.email}:`, err)
      errors.push(`${user.id}: ${err.message}`)
    }
  }

  console.log('annual-review:', { sent, errors })
  return res.status(200).json({ sent, total: candidates.length, errors })
}

// ─────────────────────────────────────────────────────────────────────────────
// Email HTML
// ─────────────────────────────────────────────────────────────────────────────
function annualReviewHtml(name, plan, accountCount, documentCount, contactCount) {
  const first    = name?.split(' ')[0] || 'there'
  const planName = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Essential'

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
            ${first}, it's been a year.
          </h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            You've had your <strong>${planName}</strong> plan for about 12 months — with ${accountCount} financial ${accountCount === 1 ? 'account' : 'accounts'}, ${documentCount} ${documentCount === 1 ? 'document' : 'documents'}, and ${contactCount} trusted ${contactCount === 1 ? 'contact' : 'contacts'} in your vault.
          </p>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            A lot can change in a year. It only takes a few minutes to check that your plan still reflects your life.
          </p>

          <p style="margin:0 0 12px;color:#0d1628;font-size:15px;font-weight:bold;">Three things that commonly change:</p>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;width:100%;background:#f9f8f6;border-radius:10px;padding:8px;">
            <tr>
              <td style="padding:10px 14px;vertical-align:top;font-size:20px;line-height:1;">🏡</td>
              <td style="padding:10px 0;color:#4a5568;font-size:14px;line-height:1.6;"><strong>New property or assets</strong> — a new home, inheritance, pension, or investment account that isn't in your plan yet.</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;vertical-align:top;font-size:20px;line-height:1;">💼</td>
              <td style="padding:10px 0;color:#4a5568;font-size:14px;line-height:1.6;"><strong>Pension changes</strong> — a new employer, a transferred pension, or a defined benefit scheme with updated beneficiaries.</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;vertical-align:top;font-size:20px;line-height:1;">🤝</td>
              <td style="padding:10px 0;color:#4a5568;font-size:14px;line-height:1.6;"><strong>Executor or trusted contact update</strong> — a relationship change, bereavement, or simply someone better placed to act on your behalf.</td>
            </tr>
          </table>

          <a href="${APP_URL}/dashboard"
             style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">
            Review my plan →
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
