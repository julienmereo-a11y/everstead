import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n'

// Upload document → real file upload via useDocuments().uploadFile (documents
// table + `documents` storage bucket). Uploading an LPA auto-satisfies the
// vault's missing-LPA prompt (the prompt is derived from real docs).
export default function UploadSheet({ app }) {
  const { t } = useTranslation('mobile')
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
      <h3 className="sh-title">{t('sheets.uploadTitle')}</h3>
      <label className="flabel">{t('sheets.docName')}</label>
      <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder={t('sheets.docNamePh')} />
      <label className="flabel">{t('sheets.file')}</label>
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
            <div className="rdet" style={{ marginTop: 2 }}>{t('sheets.readyToUpload', { size: prettySize })}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-stone-600)' }}>{t('sheets.tapToChoose')}</div>
            <div className="rdet" style={{ marginTop: 2 }}>{t('sheets.fileTypes')}</div>
          </>
        )}
      </div>
      <label className="flabel">{t('sheets.expiry')} <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--color-stone-400)' }}>{t('sheets.expiryOptional')}</span></label>
      <input className="inp" type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
      <p className="rdet" style={{ margin: '6px 0 0' }}>{t('sheets.expiryNote')}</p>

      <button className={`btn w100 ${canSubmit ? '' : 'dis'}`} style={{ marginTop: 20 }} onClick={submit}>
        {busy ? t('sheets.uploading') : t('sheets.addToVault')}
      </button>
    </>
  )
}
