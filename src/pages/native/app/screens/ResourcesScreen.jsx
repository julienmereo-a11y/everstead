import React, { useState } from 'react'
import { ChevronIcon } from '../icons'
import SecScreen from '../components/SecScreen'

const GUIDES = [
  { t: 'Accounts', body: 'Add each bank, pension, investment and insurance policy. Include the provider and the last four digits — never full numbers or passwords.' },
  { t: 'Documents', body: 'Upload your will, property deeds, insurance policies and passports. Everstead keeps them encrypted and shares them only with the people you choose.' },
  { t: 'People', body: 'Invite the people you trust — a partner, executor or solicitor — and choose exactly what each can see, and when.' },
  { t: 'Instructions', body: 'Write step-by-step notes for your family: what to do in the first 48 hours, who to contact, and where to find things.' },
  { t: 'Personal messages', body: 'Record sealed letters or videos for the people you love, delivered when the time is right.' },
]

export default function ResourcesScreen({ app }) {
  const [open, setOpen] = useState(0)
  return (
    <SecScreen title="Help & Resources" subtitle="Guides for every part of your plan" onBack={() => app.go('more')}>
      <div className="fx col gap12">
        {GUIDES.map((g, i) => (
          <div key={g.t} className="card-light ohide">
            <div className="row" onClick={() => setOpen(open === i ? -1 : i)}>
              <div className="f1"><div className="rname">{g.t}</div></div>
              <span style={{ transform: open === i ? 'rotate(90deg)' : 'none', transition: 'transform .2s', color: 'var(--color-stone-300)' }}><ChevronIcon /></span>
            </div>
            {open === i && (
              <div className="bt" style={{ padding: '12px 16px', fontSize: 13.5, lineHeight: 1.55, color: 'var(--color-stone-600)' }}>{g.body}</div>
            )}
          </div>
        ))}
      </div>
      <p className="rdet" style={{ marginTop: 18, textAlign: 'center' }}>
        Need a hand? Email <a href="mailto:hello@everstead.care" style={{ color: 'var(--color-navy-600)' }}>hello@everstead.care</a>
      </p>
    </SecScreen>
  )
}
