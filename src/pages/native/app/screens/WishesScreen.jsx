import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n'
import { useWishes } from '../../../../hooks/useData'
import { PlusIcon } from '../icons'
import SecScreen, { Busy } from '../components/SecScreen'

const CATEGORIES = ['Funeral', 'Personal Letters', 'Sentimental Items', 'Digital Legacy', 'Other']

export default function WishesScreen({ app }) {
  const { t } = useTranslation('mobile')
  const live = useWishes()
  const data = app.demo ? app.demoData.wishes : live.data
  const loading = app.demo ? false : live.loading
  const add = app.demo ? (row => app.demoAppend('wishes', row)) : live.add
  const [sheet, setSheet] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Funeral')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const canSubmit = title.trim().length > 0 && !busy
  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    try {
      await add({ title: title.trim(), category, body: body.trim() })
      setSheet(false); setTitle(''); setBody(''); setCategory('Funeral')
      app.say(t('wishesScr.saved'))
    } catch { app.say(t('wishesScr.saveFailed'), 'error') } finally { setBusy(false) }
  }

  return (
    <SecScreen
      title={t('wishesScr.title')}
      subtitle={loading ? '' : t('wishesScr.recorded', { count: data.length })}
      onBack={() => app.go('more')}
      action={<button className="btn btn-sm" onClick={() => setSheet(true)}><PlusIcon />{t('common.add')}</button>}
    >
      {loading ? (
        <Busy />
      ) : data.length === 0 ? (
        <div className="card-light" style={{ padding: 18 }}><p className="rdet" style={{ margin: 0 }}>{t('wishesScr.empty')}</p></div>
      ) : (
        <div className="fx col gap12">
          {data.map(w => (
            <div key={w.id} className="card-light" style={{ padding: 16 }}>
              <div className="fx jb ac"><div className="rname">{w.title}</div><span className="chip chip-navy">{t('wishCats.' + w.category, { defaultValue: w.category })}</span></div>
              {w.body && <p className="rdet" style={{ marginTop: 8, lineHeight: 1.5 }}>{w.body}</p>}
            </div>
          ))}
        </div>
      )}

      {sheet && (
        <div className="sheet-wrap">
          <div className="scrim" onClick={() => setSheet(false)} />
          <div className="sheet">
            <button className="grab" aria-label="Close" onClick={() => setSheet(false)} style={{ display: 'block', border: 0, cursor: 'pointer', padding: 10, margin: '-10px auto 4px', background: 'none' }}><span style={{ display: 'block', width: 36, height: 4, borderRadius: 99, background: 'var(--color-stone-300)' }} /></button>
            <h3 className="sh-title">{t('wishesScr.sheetTitle')}</h3>
            <label className="flabel">{t('wishesScr.titleLabel')}</label>
            <input className="inp" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('wishesScr.titlePh')} />
            <label className="flabel">{t('sheets.category')}</label>
            <div className="fchips">
              {CATEGORIES.map(c => <button key={c} className={`fchip ${category === c ? 'sel' : ''}`} onClick={() => setCategory(c)}>{t('wishCats.' + c, { defaultValue: c })}</button>)}
            </div>
            <label className="flabel">{t('wishesScr.details')}</label>
            <textarea className="inp" rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder={t('wishesScr.detailsPh')} style={{ resize: 'none' }} />
            <button className={`btn w100 ${canSubmit ? '' : 'dis'}`} style={{ marginTop: 20 }} onClick={submit}>{busy ? t('common.saving') : t('wishesScr.saveWish')}</button>
          </div>
        </div>
      )}
    </SecScreen>
  )
}
