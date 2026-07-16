import React, { useState } from 'react'
import { ACCOUNT_CATEGORIES } from '../helpers'

// Add account → writes a real row via useAccounts().add (accounts table).
export default function AddAccountSheet({ app }) {
  const [institution, setInstitution] = useState('')
  const [accountType, setAccountType] = useState('')
  const [category, setCategory] = useState('Banking')
  const [busy, setBusy] = useState(false)

  const canSubmit = institution.trim().length > 0 && !busy

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    try {
      await app.addAccount({ institution: institution.trim(), account_type: accountType.trim(), category })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h3 className="sh-title">Add an account</h3>
      <label className="flabel">Provider</label>
      <input className="inp" value={institution} onChange={e => setInstitution(e.target.value)} placeholder="e.g. Barclays" />
      <label className="flabel">What is it?</label>
      <input className="inp" value={accountType} onChange={e => setAccountType(e.target.value)} placeholder="e.g. Joint current account" />
      <label className="flabel">Category</label>
      <div className="fchips">
        {ACCOUNT_CATEGORIES.map(c => (
          <button key={c} className={`fchip ${category === c ? 'sel' : ''}`} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>
      <button className={`btn w100 ${canSubmit ? '' : 'dis'}`} style={{ marginTop: 20 }} onClick={submit}>
        {busy ? 'Adding…' : 'Add account'}
      </button>
    </>
  )
}
