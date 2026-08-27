import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n'
import { ACCOUNT_CATEGORIES, accountCatLabel } from '../helpers'

// Add account → writes a real row via useAccounts().add (accounts table).
export default function AddAccountSheet({ app }) {
  const { t } = useTranslation('mobile')
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
      <h3 className="sh-title">{t('sheets.addTitle')}</h3>
      <label className="flabel">{t('sheets.provider')}</label>
      <input className="inp" value={institution} onChange={e => setInstitution(e.target.value)} placeholder={t('sheets.providerPh')} />
      <label className="flabel">{t('sheets.whatIsIt')}</label>
      <input className="inp" value={accountType} onChange={e => setAccountType(e.target.value)} placeholder={t('sheets.whatIsItPh')} />
      <label className="flabel">{t('sheets.category')}</label>
      <div className="fchips">
        {ACCOUNT_CATEGORIES.map(c => (
          <button key={c} className={`fchip ${category === c ? 'sel' : ''}`} onClick={() => setCategory(c)}>{accountCatLabel(c)}</button>
        ))}
      </div>
      <button className={`btn w100 ${canSubmit ? '' : 'dis'}`} style={{ marginTop: 20 }} onClick={submit}>
        {busy ? t('sheets.adding') : t('sheets.addAccount')}
      </button>
    </>
  )
}
