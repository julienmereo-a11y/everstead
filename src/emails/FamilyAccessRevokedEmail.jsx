import React from 'react'

const appUrl = 'https://www.everstead.care'

export default function FamilyAccessRevokedEmail({ secondaryName }) {
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
                Your Family plan access has ended
              </h1>
              <p style={{ margin: '0 0 16px', color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
                Hi {secondaryName || 'there'},
              </p>
              <p style={{ margin: '0 0 16px', color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
                Your access to the Everstead Family plan has ended. Your vault and all your data are safe — but you'll need your own plan to keep using Everstead.
              </p>
              <p style={{ margin: '0 0 32px', color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
                If you'd like to continue, you can start your own plan in minutes. Your existing data will be preserved.
              </p>
              <table cellPadding="0" cellSpacing="0" style={{ margin: '0 0 24px' }}>
                <tbody><tr><td style={{ background: '#4c7d47', borderRadius: '8px' }}>
                  <a href={`${appUrl}/get-started`} style={{ display: 'inline-block', padding: '14px 32px', color: '#ffffff', textDecoration: 'none', fontSize: '15px' }}>
                    Start your own plan →
                  </a>
                </td></tr></tbody>
              </table>
              <p style={{ margin: '0', color: '#9ca3af', fontSize: '13px', lineHeight: '1.5' }}>
                If you have any questions, we're here to help.
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
