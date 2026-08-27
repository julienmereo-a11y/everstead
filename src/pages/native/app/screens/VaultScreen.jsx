import React from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n'
import { PlusIcon, DocIcon } from '../icons'

// Vault — real documents (documents table via useDocuments) with status chips,
// plus the "missing LPA" suggestion prompt when no LPA is on file.
export default function VaultScreen({ app }) {
  const { t } = useTranslation('mobile')
  const { docsV, vaultSub, openUpload, lpaMissing, openLpa } = app
  return (
    <div className="scr">
      <div className="head">
        <div><h1 className="h1">{t('vault.title')}</h1><p className="sub">{vaultSub}</p></div>
        <button className="btn btn-sm" onClick={openUpload}><PlusIcon />{t('vault.upload')}</button>
      </div>
      <div className="pad">
        <div className="card-light ohide">
          {docsV.length === 0 ? (
            <div className="row" style={{ cursor: 'default' }}>
              <span className="dicon"><DocIcon /></span>
              <div className="f1"><div className="rdet">{t('vault.empty')}</div></div>
            </div>
          ) : (
            docsV.map((d, i) => (
              <div key={d.id} className={`row ${i === 0 ? '' : 'bt'}`} style={{ cursor: 'default' }}>
                <span className="dicon"><DocIcon /></span>
                <div className="f1"><div className="rname">{d.name}</div><div className="rdet">{d.detail}</div></div>
                <span className={`chip ${d.chipCls}`}>{d.status}</span>
              </div>
            ))
          )}
        </div>

        {lpaMissing && (
          <div className="drop" style={{ marginTop: 16 }} onClick={openLpa}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-stone-700)' }}>{t('vault.missingLpa')}</div>
            <div className="rdet" style={{ marginTop: 3 }}>{t('vault.lpaSuggest')}</div>
            <button className="btn btn-sm" style={{ marginTop: 12 }}>{t('vault.uploadNow')}</button>
          </div>
        )}
      </div>
    </div>
  )
}
