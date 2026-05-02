import React from 'react'

const appUrl = import.meta.env?.VITE_APP_URL || 'https://www.everstead.care'

export default function InviteAcceptedEmail({ ownerName, inviteeName, role }) {
  return (
    <table width="100%" cellPadding="0" cellSpacing="0" style={{ background: '#f5f4f0', padding: '40px 0', fontFamily: 'Georgia, serif' }}>
      <tbody><tr><td align="center">
        <table width="560" cellPadding="0" cellSpacing="0" style={{ background: '#ffffff', borderRadius: '12px', overflow: 'hidden', maxWidth: '560px', width: '100%' }}>
          <tbody>
            <tr><td style={{ background: '#0d1628', padding: '32px 40px', textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#ffffff', fontSize: '22px', fontWeight: 'normal', letterSpacing: '0.5px' }}>Everstead</p>
            </td></tr>
            <tr><td style={{ padding: '40px' }}>
              <h1 style={{ margin: '0 0 16px', color: '#0d1628', fontSize: '24px', fontWeight: 'normal' }}>{inviteeName || 'Your contact'} has accepted your invite</h1>
              <p style={{ margin: '0 0 16px', color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
                Hi {ownerName || 'there'}, <strong>{inviteeName || 'your contact'}</strong>{role ? ` (${role})` : ''} has accepted your invitation and can now access their permitted sections of your estate plan.
              </p>
              <p style={{ margin: '0 0 32px', color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>You can review and manage their access permissions from your dashboard at any time.</p>
              <a href={`${appUrl}/dashboard`} style={{ display: 'inline-block', background: '#0d1628', color: '#ffffff', textDecoration: 'none', padding: '14px 28px', borderRadius: '8px', fontSize: '15px' }}>View dashboard →</a>
            </td></tr>
            <tr><td style={{ padding: '24px 40px', borderTop: '1px solid #e8e5e0' }}>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: '13px', lineHeight: '1.5' }}>Questions? <a href="mailto:support@everstead.care" style={{ color: '#4c7d47' }}>support@everstead.care</a></p>
            </td></tr>
          </tbody>
        </table>
      </td></tr></tbody>
    </table>
  )
}
