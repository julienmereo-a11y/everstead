import React from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n'
import { PlusIcon } from '../icons'
import { accountCatLabel } from '../helpers'

// Accounts — real accounts grouped by category (accounts table via useAccounts).
// Rows are display-only (no chevron/tap) until a real detail view ships —
// a chevron that dead-ends in a "coming soon" toast reads as unfinished.
export default function AccountsScreen({ app }) {
  const { t } = useTranslation('mobile')
  const { accGroups, accSub, openAdd } = app
  return (
    <div className="scr">
      <div className="head">
        <div><h1 className="h1">{t('accountsScr.title')}</h1><p className="sub">{accSub}</p></div>
        <button className="btn btn-sm" onClick={openAdd}><PlusIcon />{t('common.add')}</button>
      </div>
      <div className="pad">
        {accGroups.length === 0 && (
          <div className="card-light" style={{ padding: 18 }}>
            <p className="rdet" style={{ margin: 0 }}>{t('accountsScr.empty')}</p>
          </div>
        )}
        {accGroups.map(g => (
          <React.Fragment key={g.cat}>
            <div className="eyebrow">{accountCatLabel(g.cat)}</div>
            <div className="card-light ohide" style={{ marginBottom: 18 }}>
              {g.items.map((a, i) => (
                <div key={a.id} className={`row ${i === 0 ? '' : 'bt'}`} style={{ cursor: 'default' }}>
                  <span className="avatar">{a.letter}</span>
                  <div className="f1"><div className="rname">{a.name}</div><div className="rdet">{a.detail}</div></div>
                </div>
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
