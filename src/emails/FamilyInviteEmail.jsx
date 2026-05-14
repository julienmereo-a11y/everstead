import React from 'react'

const appUrl = 'https://www.everstead.care'

export default function FamilyInviteEmail({ primaryName, secondaryEmail, inviteUrl }) {
  return (
    <table width="100%" cellPadding="0" cellSpacing="0" style={{ background: '#f5f4f0', padding: '40px 0', fontFamily: 'Georgia, serif' }}>
      <tbody><tr><td align="center">
        <table width="560" cellPadding="0" cellSpacing="0" style={{ background: '#ffffff', borderRadius: '12px', overflow: 'hidden', maxWidth: '560px', width: '100%' }}>
          <tbody>
            <tr><td style={{ background: '#0d1628', padding: '28px 40px', textAlign: 'center' }}>
              <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160" style={{ display: 'block', margin: '0 auto', height: 'auto', maxWidth: '160px' }} />
            </td></tr>
            <tr><td style={{ padding: '40px' }}>
              <h1 style={{ margin: '0 0 16px', color: '#0d1628', fontSize: '24px', fontWeight: 'normal', lineHeight: '1.3' }}>
                {primaryName || 'Someone'} has invited you to Everstead
              </h1>
              <p style={{ margin: '0 0 16px', color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
                <strong>{primaryName || 'Someone'}</strong> has invited you to set up your own private Everstead vault — as part of their Family plan.
              </p>
              <p style={{ margin: '0 0 16px', color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
                You'll have your own completely private account. <strong>{primaryName || 'They'}</strong> won't be able to see your documents, accounts, or wishes unless you choose to share them.
              </p>
              <ul style={{ margin: '0 0 32px', padding: '0', listStyle: 'none' }}>
                {[
                  'Your own private vault — fully separate from theirs',
                  'Organise your accounts, documents, and final wishes',
                  'Control exactly what, if anything, you share',
                  'Covered by their Family plan — no extra cost to you',
                ].map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ color: '#4c7d47', fontSize: '16px', lineHeight: '1.4', flexShrink: 0 }}>✓</span>
                    <span style={{ color: '#4a5568', fontSize: '15px', lineHeight: '1.5' }}>{item}</span>
                  </li>
                ))}
              </ul>
              <table cellPadding="0" cellSpacing="0" style={{ margin: '0 0 24px' }}>
                <tbody><tr><td style={{ background: '#4c7d47', borderRadius: '8px' }}>
                  <a href={inviteUrl || `${appUrl}/accept-family-invite`} style={{ display: 'inline-block', padding: '14px 32px', color: '#ffffff', textDecoration: 'none', fontSize: '15px' }}>
                    Accept invitation →
                  </a>
                </td></tr></tbody>
              </table>
              <p style={{ margin: '0', color: '#9ca3af', fontSize: '13px', lineHeight: '1.5' }}>
                This invitation expires in 7 days. If you weren't expecting this, you can safely ignore it.
              </p>
            </td></tr>
            <tr><td style={{ padding: '24px 40px', borderTop: '1px solid #e8e5e0' }}>
              <p style={{ margin: '0', color: '#9ca3af', fontSize: '13px', lineHeight: '1.5' }}>
                Questions? <a href="mailto:support@everstead.care" style={{ color: '#4c7d47' }}>support@everstead.care</a>
                <br />
                <span style={{ marginTop: '8px', display: 'block' }}>— Julien, Everstead</span>
              </p>
            </td></tr>
          </tbody>
        </table>
      </td></tr></tbody>
    </table>
  )
}
