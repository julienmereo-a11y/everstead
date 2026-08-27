import React from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n'
import { planLabel, FREE_LIMITS } from '../../../../config/pricing'

// Shown when a free-tier user hits a cap (FREE_LIMITS, DB-enforced) and tries to
// add another. Rather than letting the add fail against RLS, we intercept and
// nudge to Everstead+. `nudge.noun` is the resource key from MobileAppAuthed.
//
// The copy used to hard-code "includes 1 …", which survived the limit raise to
// 5/5/3 and quietly understated the free plan. The numbers now come from
// FREE_LIMITS, the same constant the caps themselves derive from.
const LIMIT_FOR = {
  'account':         { bodyKey: 'sheets.limitBodyAccount',  n: FREE_LIMITS.accounts },
  'document':        { bodyKey: 'sheets.limitBodyDocument', n: FREE_LIMITS.documents },
  'trusted contact': { bodyKey: 'sheets.limitBodyContact',  n: FREE_LIMITS.trustedPeople },
}

export default function LimitSheet({ nudge, onUpgrade, onClose }) {
  const { t } = useTranslation('mobile')
  const cfg = LIMIT_FOR[nudge?.noun] || LIMIT_FOR['account']
  const plan = planLabel('family')
  return (
    <>
      <h3 className="sh-title">{t('sheets.limitTitle')}</h3>
      <p className="rdet" style={{ margin: '0 0 18px', lineHeight: 1.55 }}>
        {t(cfg.bodyKey, { n: cfg.n, plan })}
      </p>
      <button className="btn w100" onClick={onUpgrade}>{t('sheets.upgradeTo', { plan })}</button>
      <button
        onClick={onClose}
        style={{ display: 'block', width: '100%', marginTop: 10, background: 'none', border: 0, color: 'var(--color-stone-500)', font: '500 13.5px var(--font-sans)', cursor: 'pointer', padding: 8 }}
      >
        {t('sheets.notNow')}
      </button>
    </>
  )
}
