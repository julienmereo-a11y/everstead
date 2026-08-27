import React from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n'
import { useActivityLog } from '../../../../hooks/useData'
import { activityText, relativeTime } from '../helpers'
import SecScreen, { Busy } from '../components/SecScreen'

export default function ActivityScreen({ app }) {
  const { t } = useTranslation('mobile')
  const live = useActivityLog(100)
  const data = app.demo ? app.demoData.activity : live.data
  const loading = app.demo ? false : live.loading
  return (
    <SecScreen title={t('activityScr.title')} subtitle={t('activityScr.subtitle')} onBack={() => app.go('more')}>
      {loading ? (
        <Busy />
      ) : data.length === 0 ? (
        <div className="card-light" style={{ padding: 18 }}><p className="rdet" style={{ margin: 0 }}>{t('activityScr.empty')}</p></div>
      ) : (
        <div className="card-light ohide">
          {data.map((r, i) => (
            <div key={r.id} className={`arow ${i === 0 ? '' : 'bt'}`}>
              <span className="f1">{activityText(r)}</span>
              <span className="awhen">{relativeTime(r.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </SecScreen>
  )
}
