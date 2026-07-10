import React from 'react'
import { emailPlanLabel } from './planLabel'

const appUrl = import.meta.env?.VITE_APP_URL || 'https://www.everstead.care'

export default function TrialEndingEmail({ name, plan, trialEndsAt, daysLeft = 3 }) {
  const endDate = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <table width="100%" cellPadding="0" cellSpacing="0" style={{ background: '#f5f4f0', padding: '40px 0', fontFamily: 'Georgia, serif' }}>
      <tbody><tr><td align="center">
        <table width="560" cellPadding="0" cellSpacing="0" style={{ background: '#ffffff', borderRadius: '12px', overflow: 'hidden', maxWidth: '560px', width: '100%' }}>
          <tbody>
            <tr><td style={{ background: '#0d1628', padding: '32px 40px', textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#ffffff', fontSize: '22px', fontWeight: 'normal', letterSpacing: '0.5px' }}>Everstead</p>
            </td></tr>
            <tr><td style={{ padding: '40px' }}>
              <h1 style={{ margin: '0 0 16px', color: '#0d1628', fontSize: '24px', fontWeight: 'normal' }}>
                Your trial ends {daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`}
              </h1>
              <p style={{ margin: '0 0 16px', color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
                Hi {name || 'there'}, your free trial on the <strong>{emailPlanLabel(plan)}</strong> plan ends{endDate ? <> on <strong>{endDate}</strong></> : ' soon'}.
              </p>
              <p style={{ margin: '0 0 32px', color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>Add your payment details to keep your estate plan, documents, and trusted contacts intact.</p>
              <a href={`${appUrl}/dashboard`} style={{ display: 'inline-block', background: '#0d1628', color: '#ffffff', textDecoration: 'none', padding: '14px 28px', borderRadius: '8px', fontSize: '15px' }}>Add payment details →</a>
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
