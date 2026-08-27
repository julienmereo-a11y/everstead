import React from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n'
import { CheckIcon, ChevronIcon } from '../icons'

// Plan — the REAL estate-readiness model (../readiness.js), not a mock checklist.
// Overall score + the four readiness areas as progress rows, each linking to the
// tab where you close the gap. Matches how the web derives readiness.
export default function PlanScreen({ app }) {
  const { t } = useTranslation('mobile')
  const { scorePct, scoreTxt, planSub, readinessRows } = app
  return (
    <div className="scr">
      <div className="head"><div><h1 className="h1">{t('plan.title')}</h1><p className="sub">{planSub}</p></div></div>
      <div className="pad">
        <div className="card-light" style={{ padding: 16 }}>
          <div className="fx jb ac">
            <span className="fs13 fw6">{scoreTxt}</span>
            <span className="serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-navy-800)' }}>{scorePct}</span>
          </div>
          <div className="prog" style={{ marginTop: 10 }}><div className="prog-fill" style={{ width: scorePct }} /></div>
        </div>

        <div className="fx jb ac" style={{ margin: '20px 0 8px' }}>
          <span className="eyebrow m0">{t('plan.yourReadiness')}</span>
        </div>
        <div className="card-light ohide">
          {readinessRows.map((r, i) => (
            <div key={r.key} className={`task ${i === 0 ? '' : 'bt'}`} onClick={() => app.go(r.screen)}>
              <span className={`ck ${r.done ? 'on' : ''}`}><CheckIcon on={r.done} /></span>
              <span className={`task-lbl ${r.done ? 'done' : ''}`}>{r.label}</span>
              <span className="rdet m0" style={{ marginRight: 6 }}>{r.detail}</span>
              <ChevronIcon />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
