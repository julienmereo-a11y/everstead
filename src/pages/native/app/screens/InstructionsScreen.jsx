import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n'
import { useInstructions } from '../../../../hooks/useData'
import { PlusIcon } from '../icons'
import SecScreen, { Busy } from '../components/SecScreen'

// Must match the DB CHECK constraint (instructions_category_check) exactly —
// 'Digital' is NOT an allowed category (the insert would be rejected); 'Legal' is.
const CATEGORIES = ['Immediate', 'Financial', 'Legal', 'Household', 'Medical', 'Personal', 'Other']
const AUDIENCES = ['Executor', 'Family', 'Everyone']

export default function InstructionsScreen({ app }) {
  const { t } = useTranslation('mobile')
  const live = useInstructions()
  const data = app.demo ? app.demoData.instructions : live.data
  const loading = app.demo ? false : live.loading
  const addWithSteps = app.demo
    ? (({ title, category, audience, body, steps }) => app.demoAppend('instructions', { title, category, audience, body, instruction_steps: steps.map((s, i) => ({ id: i, body: s, step_order: i })) }))
    : live.addWithSteps
  const [sheet, setSheet] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'Immediate', audience: 'Executor', body: '', steps: '' })
  const [busy, setBusy] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const canSubmit = form.title.trim() && !busy

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    try {
      const steps = form.steps.split('\n').map(s => s.trim()).filter(Boolean)
      await addWithSteps({ title: form.title.trim(), category: form.category, audience: form.audience, body: form.body.trim(), steps })
      setSheet(false); setForm({ title: '', category: 'Immediate', audience: 'Executor', body: '', steps: '' })
      app.say(t('instrScr.saved'))
    } catch { app.say(t('wishesScr.saveFailed'), 'error') } finally { setBusy(false) }
  }

  return (
    <SecScreen
      title={t('instrScr.title')}
      subtitle={loading ? '' : t('instrScr.count', { count: data.length })}
      onBack={() => app.go('more')}
      action={<button className="btn btn-sm" onClick={() => setSheet(true)}><PlusIcon />{t('instrScr.new')}</button>}
    >
      {loading ? (
        <Busy />
      ) : data.length === 0 ? (
        <div className="card-light" style={{ padding: 18 }}><p className="rdet" style={{ margin: 0 }}>{t('instrScr.empty')}</p></div>
      ) : (
        <div className="fx col gap12">
          {data.map(ins => (
            <div key={ins.id} className="card-light" style={{ padding: 16 }}>
              <div className="fx jb ac"><div className="rname">{ins.title}</div><span className="chip chip-navy">{t('instrCats.' + ins.category, { defaultValue: ins.category })}</span></div>
              <div className="rdet" style={{ marginTop: 2 }}>{t('instrScr.forAudience', { audience: t('audiences.' + ins.audience, { defaultValue: ins.audience }) })}</div>
              {ins.body && <p className="rdet" style={{ marginTop: 8, lineHeight: 1.5, color: 'var(--color-stone-600)' }}>{ins.body}</p>}
              {Array.isArray(ins.instruction_steps) && ins.instruction_steps.length > 0 && (
                <ol style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13.5, color: 'var(--color-stone-700)', lineHeight: 1.6 }}>
                  {[...ins.instruction_steps].sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0)).map(s => <li key={s.id}>{s.body}</li>)}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}

      {sheet && (
        <div className="sheet-wrap">
          <div className="scrim" onClick={() => setSheet(false)} />
          <div className="sheet">
            <button className="grab" aria-label="Close" onClick={() => setSheet(false)} style={{ display: 'block', border: 0, cursor: 'pointer', padding: 10, margin: '-10px auto 4px', background: 'none' }}><span style={{ display: 'block', width: 36, height: 4, borderRadius: 99, background: 'var(--color-stone-300)' }} /></button>
            <h3 className="sh-title">{t('instrScr.sheetTitle')}</h3>
            <label className="flabel">{t('instrScr.titleLabel')}</label>
            <input className="inp" value={form.title} onChange={e => set('title', e.target.value)} placeholder={t('instrScr.titlePh')} />
            <label className="flabel">{t('instrScr.category')}</label>
            <div className="fchips">{CATEGORIES.map(c => <button key={c} className={`fchip ${form.category === c ? 'sel' : ''}`} onClick={() => set('category', c)}>{t('instrCats.' + c, { defaultValue: c })}</button>)}</div>
            <label className="flabel">{t('instrScr.for')}</label>
            <div className="fchips">{AUDIENCES.map(a => <button key={a} className={`fchip ${form.audience === a ? 'sel' : ''}`} onClick={() => set('audience', a)}>{t('audiences.' + a, { defaultValue: a })}</button>)}</div>
            <label className="flabel">{t('instrScr.overview')}</label>
            <textarea className="inp" rows={2} value={form.body} onChange={e => set('body', e.target.value)} placeholder={t('instrScr.overviewPh')} style={{ resize: 'none' }} />
            <label className="flabel">{t('instrScr.steps')}</label>
            <textarea className="inp" rows={4} value={form.steps} onChange={e => set('steps', e.target.value)} placeholder={t('instrScr.stepsPh')} style={{ resize: 'none' }} />
            <button className={`btn w100 ${canSubmit ? '' : 'dis'}`} style={{ marginTop: 20 }} onClick={submit}>{busy ? t('common.saving') : t('instrScr.saveInstruction')}</button>
          </div>
        </div>
      )}
    </SecScreen>
  )
}
