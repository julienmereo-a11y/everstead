import React, { useRef, useState } from 'react'

// Upload document → real file upload via useDocuments().uploadFile (documents
// table + `documents` storage bucket). Uploading an LPA auto-satisfies the
// vault's missing-LPA prompt (the prompt is derived from real docs).
export default function UploadSheet({ app }) {
  const [name, setName] = useState(app.sheetPrefill?.name || '')
  const [file, setFile] = useState(null)
  const [expiresAt, setExpiresAt] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInput = useRef(null)

  const canSubmit = name.trim().length > 0 && !!file && !busy

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    try {
      // expires_at is what makes document-expiry reminders possible — without it the
      // whole reminder path is dead for anyone who only ever uses the app.
      await app.uploadDocument({ name: name.trim(), file, expires_at: expiresAt || null })
    } finally {
      setBusy(false)
    }
  }

  const prettySize = file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ''

  return (
    <>
      <h3 className="sh-title">Upload a document</h3>
      <label className="flabel">Document name</label>
      <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lasting Power of Attorney" />
      <label className="flabel">File</label>
      <input
        ref={fileInput}
        type="file"
        accept=".pdf,image/*"
        style={{ display: 'none' }}
        onChange={e => setFile(e.target.files?.[0] || null)}
      />
      <div className={`drop ${file ? 'picked' : ''}`} onClick={() => fileInput.current?.click()}>
        {file ? (
          <>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-sage-700)' }}>{file.name}</div>
            <div className="rdet" style={{ marginTop: 2 }}>Ready to upload · {prettySize}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-stone-600)' }}>Tap to choose a file</div>
            <div className="rdet" style={{ marginTop: 2 }}>PDF, photo or scan</div>
          </>
        )}
      </div>
      <label className="flabel">Expiry date <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--color-stone-400)' }}>— optional</span></label>
      <input className="inp" type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
      <p className="rdet" style={{ margin: '6px 0 0' }}>Add one and we’ll remind you a month and a week before it runs out.</p>

      <button className={`btn w100 ${canSubmit ? '' : 'dis'}`} style={{ marginTop: 20 }} onClick={submit}>
        {busy ? 'Uploading…' : 'Add to vault'}
      </button>
    </>
  )
}
