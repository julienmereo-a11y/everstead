import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n'
import { ChevronIcon } from '../icons'
import SecScreen from '../components/SecScreen'

const GUIDES = [1, 2, 3, 4, 5]

export default function ResourcesScreen({ app }) {
  const { t } = useTranslation('mobile')
  const [open, setOpen] = useState(0)
  return (
    <SecScreen title={t('resourcesScr.title')} subtitle={t('resourcesScr.subtitle')} onBack={() => app.go('more')}>
      <div className="fx col gap12">
        {GUIDES.map((g, i) => (
          <div key={g} className="card-light ohide">
            <div className="row" onClick={() => setOpen(open === i ? -1 : i)}>
              <div className="f1"><div className="rname">{t(`resourcesScr.g${g}t`)}</div></div>
              <span style={{ transform: open === i ? 'rotate(90deg)' : 'none', transition: 'transform .2s', color: 'var(--color-stone-300)' }}><ChevronIcon /></span>
            </div>
            {open === i && (
              <div className="bt" style={{ padding: '12px 16px', fontSize: 13.5, lineHeight: 1.55, color: 'var(--color-stone-600)' }}>{t(`resourcesScr.g${g}b`)}</div>
            )}
          </div>
        ))}
      </div>
      <p className="rdet" style={{ marginTop: 18, textAlign: 'center' }}>
        {t('resourcesScr.needHand')} <a href="mailto:hello@everstead.care" style={{ color: 'var(--color-navy-600)' }}>hello@everstead.care</a>
      </p>
    </SecScreen>
  )
}
