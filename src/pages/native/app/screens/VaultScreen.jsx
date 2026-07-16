import React from 'react'
import { PlusIcon, DocIcon } from '../icons'

// Vault — real documents (documents table via useDocuments) with status chips,
// plus the "missing LPA" suggestion prompt when no LPA is on file.
export default function VaultScreen({ app }) {
  const { docsV, vaultSub, openUpload, lpaMissing, openLpa } = app
  return (
    <div className="scr">
      <div className="head">
        <div><h1 className="h1">Vault</h1><p className="sub">{vaultSub}</p></div>
        <button className="btn btn-sm" onClick={openUpload}><PlusIcon />Upload</button>
      </div>
      <div className="pad">
        <div className="card-light ohide">
          {docsV.length === 0 ? (
            <div className="row" style={{ cursor: 'default' }}>
              <span className="dicon"><DocIcon /></span>
              <div className="f1"><div className="rdet">No documents yet. Tap Upload to add your first.</div></div>
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
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-stone-700)' }}>Missing: Lasting Power of Attorney</div>
            <div className="rdet" style={{ marginTop: 3 }}>Everstead suggests adding this next</div>
            <button className="btn btn-sm" style={{ marginTop: 12 }}>Upload now</button>
          </div>
        )}
      </div>
    </div>
  )
}
