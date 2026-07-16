import React from 'react'
import { PlusIcon } from '../icons'

// Accounts — real accounts grouped by category (accounts table via useAccounts).
// Rows are display-only (no chevron/tap) until a real detail view ships —
// a chevron that dead-ends in a "coming soon" toast reads as unfinished.
export default function AccountsScreen({ app }) {
  const { accGroups, accSub, openAdd } = app
  return (
    <div className="scr">
      <div className="head">
        <div><h1 className="h1">Accounts</h1><p className="sub">{accSub}</p></div>
        <button className="btn btn-sm" onClick={openAdd}><PlusIcon />Add</button>
      </div>
      <div className="pad">
        {accGroups.length === 0 && (
          <div className="card-light" style={{ padding: 18 }}>
            <p className="rdet" style={{ margin: 0 }}>No accounts yet. Tap “Add” to record your first one.</p>
          </div>
        )}
        {accGroups.map(g => (
          <React.Fragment key={g.cat}>
            <div className="eyebrow">{g.cat}</div>
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
