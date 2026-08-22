import React from 'react'
import { PlusIcon } from '../icons'

// Family — the owner plus real trusted people (trusted_people via usePeople),
// with access chips derived from access_grants / invite_status.
export default function FamilyScreen({ app }) {
  const { membersV, famSub, openInvite } = app
  return (
    <div className="scr">
      <div className="head">
        <div><h1 className="h1">Family</h1><p className="sub">{famSub}</p></div>
        <button className="btn btn-sm" onClick={openInvite}><PlusIcon />Invite</button>
      </div>
      <div className="pad">
        <div className="card-light ohide">
          {membersV.map((m, i) => (
            <div key={m.id} className={`row ${i === 0 ? '' : 'bt'}`} style={{ cursor: 'default' }}>
              <span className="avatar avatar-round">{m.initials}</span>
              <div className="f1"><div className="rname">{m.name}</div><div className="rdet">{m.rel}</div></div>
              <span className={`chip ${m.chipCls}`}>{m.access}</span>
            </div>
          ))}
        </div>
        <div className="note">
          Emergency-only members see nothing today. If something happens to you, your executor can unlock exactly what they need, nothing more.
        </div>
      </div>
    </div>
  )
}
