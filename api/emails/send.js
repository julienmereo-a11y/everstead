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
