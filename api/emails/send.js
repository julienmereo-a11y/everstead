import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { type, ...body } = req.body
  if (!type) return res.status(400).json({ error: 'Missing type' })

  try {
    if (type === 'welcome') {
      const { name, email, plan } = body
      if (!email) return res.status(400).json({ error: 'Missing email' })
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      email,
        subject: 'Welcome to Everstead',
        html:    welcomeHtml(name, plan),
      })

    } else if (type === 'invite-accepted') {
      const { ownerName, ownerEmail, inviteeName, role } = body
      if (!ownerEmail) return res.status(400).json({ error: 'Missing ownerEmail' })
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      ownerEmail,
        subject: `${inviteeName || 'Someone'} has accepted your invite`,
        html:    inviteAcceptedHtml(ownerName, inviteeName, role),
      })

    } else if (type === 'admin') {
      const { inviteeEmail, inviteUrl } = body
      if (!inviteeEmail) return res.status(400).json({ error: 'Missing inviteeEmail' })
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      inviteeEmail,
        subject: "You've been invited to join the Everstead admin team",
        html:    adminInviteHtml(inviteeEmail, inviteUrl),
      })

    } else if (type === 'invite') {
      const { inviteeName, inviteeEmail, role, ownerName, inviteToken } = body
      if (!inviteeEmail) return res.status(400).json({ error: 'Missing inviteeEmail' })
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      inviteeEmail,
        subject: `${ownerName || 'Someone'} has invited you to their Everstead plan`,
        html:    inviteHtml(inviteeName, ownerName, role, inviteToken),
      })

    } else if (type === 'tool-report') {
      // Estate Readiness Score — full report email (no auth required, public tool)
      const { name, email, score, answers } = body
      if (!email) return res.status(400).json({ error: 'Missing email' })
      // Basic email validation — prevent abuse
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email' })
      }
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      email,
        subject: `Your estate readiness score: ${score}/100`,
        html:    toolReportHtml(name, score, answers),
      })

    } else if (type === 'owner-registration') {
      // Fires immediately on signup, before Stripe checkout
      const { name, email, plan, billingCycle } = body
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      'julien@everstead.care',
        subject: `🆕 New registration — ${name || email} (${plan || 'essential'})`,
        html:    ownerRegistrationHtml({ name, email, plan, billingCycle }),
      })

    } else if (type === 'admin-direct') {
      // Admin emailing a user directly from the panel
      const { to, toName, subject, message } = body
      if (!to || !subject || !message) return res.status(400).json({ error: 'Missing to, subject, or message' })
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to,
        subject,
        html:    adminDirectHtml(toName, subject, message),
      })

    } else if (type === 'info-request') {
      // Admin requesting more info from a report submitter
      const { to, reporterName, ownerName, message } = body
      if (!to || !message) return res.status(400).json({ error: 'Missing to or message' })
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to,
        subject: `Information requested regarding your Everstead report`,
        html:    infoRequestHtml(reporterName, ownerName, message),
      })

    } else {
      return res.status(400).json({ error: `Unknown type: ${type}` })
    }

    res.status(200).json({ sent: true })
  } catch (err) {
    console.error('send email error:', err)
    res.status(500).json({ error: err.message })
  }
}

function welcomeHtml(name, plan) {
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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">Welcome, ${name || 'there'}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">Thank you for joining Everstead. You're on the <strong>${plan || 'Essential'}</strong> plan — your 14-day free trial starts now.</p>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">Everstead helps you organise everything your family needs to know — accounts, documents, contacts, and instructions — all in one secure, private place.</p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">Start by adding your first account or uploading an important document.</p>
          <a href="${process.env.VITE_APP_URL}/dashboard" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Go to your dashboard →</a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">Need help? <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function inviteAcceptedHtml(ownerName, inviteeName, role) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#0d1628;padding:32px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${inviteeName || 'Your contact'} has accepted your invite</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">Hi ${ownerName || 'there'}, <strong>${inviteeName || 'your contact'}</strong>${role ? ` (${role})` : ''} has accepted your Everstead invitation and can now access their permitted sections of your estate plan.</p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">You can review and manage their access permissions from your dashboard at any time.</p>
          <a href="${process.env.VITE_APP_URL}/dashboard" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">View dashboard →</a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">Questions? <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function adminInviteHtml(email, inviteUrl) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1628;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1628;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#141f38;border:1px solid #1e2d4a;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#0d1628;padding:28px 40px;text-align:center;border-bottom:1px solid #1e2d4a;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:44px 40px 36px;">
          <p style="margin:0 0 8px;color:#4c7d47;font-size:12px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;">Admin access</p>
          <h1 style="margin:0 0 20px;color:#ffffff;font-size:26px;font-weight:normal;line-height:1.3;">You've been invited to the Everstead admin team</h1>
          <p style="margin:0 0 20px;color:#8a9ab5;font-size:15px;line-height:1.7;">Hi ${email},<br><br>You've been granted admin access to the Everstead internal panel. Click below to set up your account — the link is unique to you and expires after use.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="background:#4c7d47;border-radius:8px;">
              <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;">Set up admin account →</a>
            </td></tr>
          </table>
          <p style="margin:0;color:#4a5568;font-size:13px;line-height:1.6;">If you weren't expecting this, ignore this email — no account will be created without clicking the link above.</p>
        </td></tr>
        <tr><td style="padding:24px 40px 32px;border-top:1px solid #1e2d4a;">
          <p style="margin:0;color:#4a5568;font-size:12px;"><a href="mailto:hello@everstead.care" style="color:#4c7d47;text-decoration:none;">hello@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function inviteHtml(inviteeName, ownerName, role, inviteToken) {
  const signupUrl = inviteToken
    ? `${process.env.VITE_APP_URL}/accept-invite?token=${inviteToken}`
    : `${process.env.VITE_APP_URL}/accept-invite`
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#0d1628;padding:28px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:44px 40px 36px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:26px;font-weight:normal;line-height:1.3;">
            You've been invited to ${ownerName ? `<strong>${ownerName}</strong>'s` : 'an'} estate plan
          </h1>
          <p style="margin:0 0 20px;color:#5a6475;font-size:15px;line-height:1.7;">
            Hi${inviteeName ? ` ${inviteeName}` : ''},<br><br>
            <strong>${ownerName || 'Someone'}</strong> has added you as their <strong>${role || 'trusted contact'}</strong> on Everstead — a secure digital estate plan that ensures their wishes and important information are organised and accessible when needed.
          </p>
          <p style="margin:0 0 32px;color:#5a6475;font-size:15px;line-height:1.7;">Create your free account to accept the invitation and view the sections you've been given access to.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="background:#0d1628;border-radius:8px;">
              <a href="${signupUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;">Accept invitation →</a>
            </td></tr>
          </table>
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">If you weren't expecting this invitation, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:24px 40px 32px;border-top:1px solid #ede9e3;">
          <p style="margin:0;color:#b0b8c1;font-size:12px;"><a href="mailto:support@everstead.care" style="color:#4c7d47;text-decoration:none;">support@everstead.care</a></p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;color:#c4bfb8;font-size:11px;text-align:center;">Everstead · everstead.care</p>
    </td></tr>
  </table>
</body>
</html>`
}

function toolReportHtml(name, score, answers) {
  const firstName = name?.split(' ')[0] || 'there'
  const appUrl    = process.env.VITE_APP_URL || 'https://www.everstead.care'

  const band = score >= 86 ? { label: 'Excellent', color: '#0d1628' }
             : score >= 61 ? { label: 'Good progress', color: '#4c7d47' }
             : score >= 31 ? { label: 'A good start', color: '#d97706' }
             :                { label: 'Needs attention', color: '#dc2626' }

  const QUESTIONS = [
    { id: 'will',     full: 'Up-to-date will' },
    { id: 'accounts', full: 'Documented accounts & assets' },
    { id: 'lpa',      full: 'Lasting Power of Attorney' },
    { id: 'trusted',  full: 'Trusted contacts designated' },
    { id: 'wishes',   full: 'Final wishes recorded in writing' },
  ]

  const rows = (answers || []).map((a, i) => {
    const q   = QUESTIONS[i] || {}
    const pts = typeof a?.points === 'number' ? a.points : 0
    const col = pts === 20 ? '#4c7d47' : pts > 0 ? '#d97706' : '#dc2626'
    return `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0ede8;font-size:14px;color:#374151;">${q.full || `Question ${i + 1}`}</td>
      <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0ede8;text-align:right;font-size:14px;font-weight:600;color:${col};">${pts}/20</td>
    </tr>`
  }).join('')

  const missing = (answers || [])
    .map((a, i) => ({ q: QUESTIONS[i], pts: typeof a?.points === 'number' ? a.points : 0 }))
    .filter(x => x.pts < 20)
    .map(x => `<li style="margin:0 0 8px;font-size:14px;color:#4a5568;line-height:1.5;">${x.pts === 0 ? '❌' : '⚠️'} ${x.q?.full || 'Item'} — ${x.pts === 0 ? 'not yet in place' : 'partially complete'}</li>`)
    .join('')

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
          <h1 style="margin:0 0 8px;color:#0d1628;font-size:24px;font-weight:normal;">Your estate readiness report</h1>
          <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">Hi ${firstName}, here's your full breakdown.</p>
          <div style="background:#f9f8f6;border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;">Your score</p>
            <p style="margin:0;font-size:56px;font-weight:300;color:${band.color};line-height:1.1;">${score}<span style="font-size:24px;">/100</span></p>
            <p style="margin:8px 0 0;font-size:16px;color:${band.color};font-weight:600;">${band.label}</p>
          </div>
          <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#0d1628;">Section breakdown</h2>
          <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
          ${missing ? `
          <div style="margin:28px 0 0;background:#fff7ed;border-radius:10px;padding:20px 24px;">
            <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#92400e;">What to focus on next</h3>
            <ul style="margin:0;padding:0;list-style:none;">${missing}</ul>
          </div>` : `
          <div style="margin:28px 0 0;background:#f0fdf4;border-radius:10px;padding:20px 24px;">
            <p style="margin:0;font-size:15px;color:#14532d;">🎉 Your plan is in excellent shape. Well done.</p>
          </div>`}
          <div style="margin:32px 0 0;text-align:center;">
            <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;">Everstead is where you put all of this in one secure place — your accounts, documents, trusted people, and final wishes.</p>
            <a href="${appUrl}/get-started" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Start your free plan →</a>
          </div>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">Questions? <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function infoRequestHtml(reporterName, ownerName, message) {
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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:22px;font-weight:normal;">Additional information required</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.7;">Hi ${reporterName || 'there'},</p>
          <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.7;">
            We are reviewing the report you submitted${ownerName ? ` regarding <strong>${ownerName}</strong>` : ''} and need a little more information before we can proceed.
          </p>
          <div style="background:#f5f4f0;border-left:3px solid #4c7d47;border-radius:4px;padding:16px 20px;margin:24px 0;">
            <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;white-space:pre-wrap;">${message}</p>
          </div>
          <p style="margin:0 0 0;color:#4a5568;font-size:15px;line-height:1.7;">
            Please reply directly to this email with the requested information and we will continue processing your report as quickly as possible.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">Everstead · <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function adminDirectHtml(toName, subject, message) {
  const escaped = message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
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
          <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.7;">Hi ${toName || 'there'},</p>
          <div style="color:#374151;font-size:15px;line-height:1.8;">${escaped}</div>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">Everstead · <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function ownerRegistrationHtml({ name, email, plan, billingCycle }) {
  const signedUpAt = new Date().toLocaleString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  })
  const row = (label, value) => value
    ? `<tr>
        <td style="padding:10px 0;color:#6b7280;font-size:14px;border-bottom:1px solid #f0ede8;width:140px;">${label}</td>
        <td style="padding:10px 0;color:#0d1628;font-size:14px;border-bottom:1px solid #f0ede8;font-weight:500;">${value}</td>
      </tr>`
    : ''
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#0d1628;padding:28px 40px;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="140" style="display:block;height:auto;" />
        </td></tr>
        <tr><td style="padding:36px 40px 28px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#4c7d47;">New registration</p>
          <h1 style="margin:0 0 6px;color:#0d1628;font-size:22px;font-weight:normal;">
            ${name || email} just created an account
          </h1>
          <p style="margin:0 0 24px;color:#9ca3af;font-size:13px;">Card not yet entered — awaiting Stripe checkout</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${row('Name', name || '—')}
            ${row('Email', `<a href="mailto:${email}" style="color:#4c7d47;">${email}</a>`)}
            ${row('Plan selected', plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : '—')}
            ${row('Billing', billingCycle ? billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1) : '—')}
            ${row('Registered', signedUpAt)}
          </table>
          <div style="margin-top:28px;">
            <a href="${process.env.VITE_APP_URL}/admin" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;">View in admin panel →</a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Everstead · automated owner notification · a follow-up email will arrive when they complete Stripe checkout</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
