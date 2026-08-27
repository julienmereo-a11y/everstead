import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n'
import { marketPricing } from '../../../../config/pricing'
import { useSubscriptions } from '../../../../hooks/useData'
import { PlusIcon } from '../icons'
import SecScreen, { Busy } from '../components/SecScreen'

export default function SubscriptionsScreen({ app }) {
  const { t, i18n } = useTranslation('mobile')
  // User-entered amounts, shown in the member's market currency. The value is a
  // bare number in the DB; the symbol follows the language, like the website.
  const market = marketPricing(i18n.language)
  const live = useSubscriptions()
  const data = app.demo ? app.demoData.subscriptions : live.data
  const loading = app.demo ? false : live.loading
  const add = app.demo ? (row => app.demoAppend('subscriptions', row)) : live.add
  const [sheet, setSheet] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [cycle, setCycle] = useState('Monthly')
  const [busy, setBusy] = useState(false)

  const monthlyTotal = data.reduce((sum, s) => sum + (s.billing_cycle === 'Annual' ? (Number(s.amount) || 0) / 12 : (Number(s.amount) || 0)), 0)
  const canSubmit = name.trim().length > 0 && !busy

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    try {
      await add({ name: name.trim(), amount: Number(amount) || 0, billing_cycle: cycle })
      setSheet(false); setName(''); setAmount(''); setCycle('Monthly')
      app.say(t('subsScr.added', { name: name.trim() }))
    } catch { app.say(t('subsScr.addFailed'), 'error') } finally { setBusy(false) }
  }

  return (
    <SecScreen
      title={t('subsScr.title')}
      subtitle={loading ? '' : data.length ? t('subsScr.total', { total: market.money(monthlyTotal), count: data.length }) : t('subsScr.keepTrack')}
      onBack={() => app.go('more')}
      action={<button className="btn btn-sm" onClick={() => setSheet(true)}><PlusIcon />{t('common.add')}</button>}
    >
      {loading ? (
        <Busy />
      ) : data.length === 0 ? (
        <div className="card-light" style={{ padding: 18 }}><p className="rdet" style={{ margin: 0 }}>{t('subsScr.empty')}</p></div>
      ) : (
        <div className="card-light ohide">
          {data.map((s, i) => (
            <div key={s.id} className={`row ${i === 0 ? '' : 'bt'}`} style={{ cursor: 'default' }}>
              <span className="avatar">{(s.name || '?')[0].toUpperCase()}</span>
              <div className="f1"><div className="rname">{s.name}</div><div className="rdet">{t('cycles.' + s.billing_cycle, { defaultValue: s.billing_cycle })}</div></div>
              <span className="rname">{market.money(Number(s.amount || 0))}</span>
            </div>
          ))}
        </div>
      )}

      {sheet && (
        <div className="sheet-wrap">
          <div className="scrim" onClick={() => setSheet(false)} />
          <div className="sheet">
            <button className="grab" aria-label="Close" onClick={() => setSheet(false)} style={{ display: 'block', border: 0, cursor: 'pointer', padding: 10, margin: '-10px auto 4px', background: 'none' }}><span style={{ display: 'block', width: 36, height: 4, borderRadius: 99, background: 'var(--color-stone-300)' }} /></button>
            <h3 className="sh-title">{t('subsScr.sheetTitle')}</h3>
            <label className="flabel">{t('subsScr.name')}</label>
            <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder={t('subsScr.namePh')} />
            <label className="flabel">{t('subsScr.amount', { symbol: market.currency === 'EUR' ? '€' : '£' })}</label>
            <input className="inp" type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder={t('subsScr.amountPh')} />
            <label className="flabel">{t('subsScr.billingCycle')}</label>
            <div className="fchips">
              {['Monthly', 'Annual'].map(c => (
                <button key={c} className={`fchip ${cycle === c ? 'sel' : ''}`} onClick={() => setCycle(c)}>{t('cycles.' + c, { defaultValue: c })}</button>
              ))}
            </div>
            <button className={`btn w100 ${canSubmit ? '' : 'dis'}`} style={{ marginTop: 20 }} onClick={submit}>
              {busy ? t('subsScr.adding') : t('subsScr.addSubscription')}
            </button>
          </div>
        </div>
      )}
    </SecScreen>
  )
}
