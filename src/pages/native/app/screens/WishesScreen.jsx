import React, { useState } from 'react'
import { useWishes } from '../../../../hooks/useData'
import { PlusIcon } from '../icons'
import SecScreen, { Busy } from '../components/SecScreen'

const CATEGORIES = ['Funeral', 'Personal Letters', 'Sentimental Items', 'Digital Legacy', 'Other']

export default function WishesScreen({ app }) {
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
      app.say('Wish saved')
    } catch { app.say('Could not save that. Please try again.', 'error') } finally { setBusy(false) }
  }

  return (
    <SecScreen
      title="Wishes"
      subtitle={loading ? '' : `${data.length} recorded`}
      onBack={() => app.go('more')}
      action={<button className="btn btn-sm" onClick={() => setSheet(true)}><PlusIcon />Add</button>}
    >
      {loading ? (
        <Busy />
      ) : data.length === 0 ? (
        <div className="card-light" style={{ padding: 18 }}><p className="rdet" style={{ margin: 0 }}>Nothing recorded yet. Start small, the music you love, a place that matters, or how you'd like things done.</p></div>
      ) : (
        <div className="fx col gap12">
          {data.map(w => (
            <div key={w.id} className="card-light" style={{ padding: 16 }}>
              <div className="fx jb ac"><div className="rname">{w.title}</div><span className="chip chip-navy">{w.category}</span></div>
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
            <h3 className="sh-title">Record a wish</h3>
            <label className="flabel">Title</label>
            <input className="inp" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. My funeral wishes" />
            <label className="flabel">Category</label>
            <div className="fchips">
              {CATEGORIES.map(c => <button key={c} className={`fchip ${category === c ? 'sel' : ''}`} onClick={() => setCategory(c)}>{c}</button>)}
            </div>
            <label className="flabel">Details</label>
            <textarea className="inp" rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your wishes here…" style={{ resize: 'none' }} />
            <button className={`btn w100 ${canSubmit ? '' : 'dis'}`} style={{ marginTop: 20 }} onClick={submit}>{busy ? 'Saving…' : 'Save wish'}</button>
          </div>
        </div>
      )}
    </SecScreen>
  )
}
