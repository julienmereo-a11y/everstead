// Documents: upload, categorise, set per-document access, and view. Includes
// the owner-side viewer modal and the per-person access editor.
//
import React, { useEffect, useState } from 'react'
import i18n from '../../../i18n'
import { baseDocumentAccess } from '../../../lib/documentAccess'
import { getLimit, isAtLimit } from '../../../lib/planLimits'
import { PlanLimitNotice, STATUS_STYLES, friendlyLimitError } from '../../dashboard/shared'
import { Checkbox, EmptyState, Field, LoadingSpinner, Modal, SectionShell, input, primaryBtn, secondaryBtn } from '../../dashboard/ui'
import { BookOpen, CheckCircle2, Download, ExternalLink, Eye, FileText, Loader2, Pencil, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
export function OwnerDocViewerModal({ doc, onClose }) {
  const { t } = useTranslation('dashboard')
  // Uploaded files live in the private `documents` storage bucket, referenced by
  // storage_path (there is no file_url column). Resolve a short-lived signed URL to
  // preview/download; fall back to file_url if a row ever carries a public one.
  const [url, setUrl]         = useState(doc?.file_url || null)
  const [loading, setLoading] = useState(!doc?.file_url && !!doc?.storage_path)

  useEffect(() => {
    let active = true
    if (doc?.file_url)      { setUrl(doc.file_url); setLoading(false); return () => { active = false } }
    if (!doc?.storage_path) { setUrl(null);         setLoading(false); return () => { active = false } }
    setLoading(true)
    ;(async () => {
      try {
        const { getDocumentUrl } = await import('../../../lib/supabase')
        const signed = await getDocumentUrl(doc.storage_path)
        if (active) setUrl(signed || null)
      } catch {
        if (active) setUrl(null)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [doc?.id, doc?.storage_path, doc?.file_url])

  if (!doc) return null
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="relative bg-white rounded-[2rem] shadow-2xl flex flex-col w-full max-w-4xl"
        style={{ height: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center">
              <FileText size={16} />
            </div>
            <div>
              <p className="font-semibold text-navy-900 text-sm">{doc.name}</p>
              <p className="text-xs text-stone-400">{t(`documents.type.${doc.doc_type}`, { defaultValue: doc.doc_type })} · {t(`documents.status.${doc.status}`, { defaultValue: doc.status })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-navy-700 bg-navy-50 hover:bg-navy-100 px-3 py-2 rounded-full transition-colors">
                  <ExternalLink size={13} /> {t('documents.viewer.openInTab')}
                </a>
                <a href={url} download={doc.name}
                  className="flex items-center gap-1.5 text-xs font-medium text-white btn-aurora hover:bg-navy-900 px-3 py-2 rounded-full transition-colors">
                  <Download size={13} /> {t('documents.viewer.download')}
                </a>
              </>
            )}
            <button onClick={onClose} className="ml-2 w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded-b-[2rem]">
          {url ? (
            <iframe src={url} title={doc.name} className="w-full h-full border-0" />
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-3">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm">{t('documents.viewer.loadingPreview')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-3">
              <FileText size={40} />
              <p className="text-sm">{t('documents.viewer.noFile')}</p>
              <p className="text-xs text-stone-300">{t('documents.viewer.noFileHint')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DOCUMENTS SECTION
// ─────────────────────────────────────────────────────────────
// ── Per-document access editor — who can see this document, and when ─────────
// Layered on top of each person's role-level access settings: overriding here
// affects THIS document only, and is changeable at any time.

export function DocumentAccessEditor({ people, form, setForm }) {
  const { t } = useTranslation('dashboard')
  const contacts = (people || []).filter(p => p.id)
  const ov = form.access_overrides || {}
  const allow = Array.isArray(ov.allow) ? ov.allow : []
  const deny  = Array.isArray(ov.deny)  ? ov.deny  : []

  const effectiveFor = (person) => {
    if (deny.includes(person.id)) return false
    if (allow.includes(person.id)) return true
    return baseDocumentAccess(person.access_grants, { doc_type: form.doc_type })
  }

  const toggle = (person) => {
    const base = baseDocumentAccess(person.access_grants, { doc_type: form.doc_type })
    const next = !effectiveFor(person)
    const newAllow = allow.filter(id => id !== person.id)
    const newDeny  = deny.filter(id => id !== person.id)
    if (next && !base) newAllow.push(person.id)
    if (!next && base) newDeny.push(person.id)
    setForm(p => ({ ...p, access_overrides: { allow: newAllow, deny: newDeny } }))
  }

  return (
    <div className="border border-stone-200 rounded-xl p-4 space-y-3 bg-stone-50/60">
      <div>
        <p className="text-xs font-semibold text-stone-600">{t('documents.access.title')}</p>
        <p className="text-[11px] text-stone-400 mt-0.5">{t('documents.access.subtitle')}</p>
      </div>
      {contacts.length === 0 ? (
        <p className="text-xs text-stone-400">{t('documents.access.noPeople')}</p>
      ) : (
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {contacts.map(person => {
            const base = baseDocumentAccess(person.access_grants, { doc_type: form.doc_type })
            const has  = effectiveFor(person)
            const overridden = has !== base
            return (
              <button
                type="button"
                key={person.id}
                onClick={() => toggle(person)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white border border-stone-200 hover:border-navy-300 transition-colors text-left"
              >
                <Checkbox checked={has} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{person.name}</p>
                  <p className="text-[11px] text-stone-400">{person.role || t('documents.access.trustedContact')}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  overridden
                    ? 'bg-navy-50 border-navy-200 text-navy-700'
                    : has ? 'bg-sage-50 border-sage-200 text-sage-800' : 'bg-stone-100 border-stone-200 text-stone-400'
                }`}>
                  {overridden ? (has ? t('documents.access.addedOverride') : t('documents.access.removedOverride')) : has ? t('documents.access.viaSettings') : t('documents.access.noAccess')}
                </span>
              </button>
            )
          })}
        </div>
      )}
      <Field label={t('documents.access.releaseLabel')}>
        <select className={input} value={form.release_timing || 'default'} onChange={e => setForm(p => ({ ...p, release_timing: e.target.value }))}>
          <option value="default">{t('documents.access.releaseDefault')}</option>
          <option value="immediate">{t('documents.access.releaseImmediate')}</option>
          <option value="sealed">{t('documents.access.releaseSealed')}</option>
        </select>
      </Field>
      {form.release_timing === 'sealed' && (
        <p className="text-[11px] text-stone-400">{t('documents.access.sealedNote')}</p>
      )}
    </div>
  )
}

// Official guidance for the two priority documents. gov.uk is correct for a UK
// member and useless to a French one, so the French tree points at our own
// French-law guides instead (both exist under /fr/resources/blog).

export const PRIORITY_GUIDANCE = {
  en: { will: 'https://www.gov.uk/make-will',              lpa: 'https://www.gov.uk/power-of-attorney' },
  fr: { will: '/fr/resources/blog/testament-reserve-hereditaire', lpa: '/fr/resources/blog/mandat-protection-future' },
}

export function DocumentsSection({ documents, loading, uploadFile, update, remove, planLimits, profile, onUpgrade, updateProfile, addAlert, onLifeEvent, people }) {
  const { t, i18n } = useTranslation('dashboard')
  const dateLocale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB'
  const emptyForm = { name: '', doc_type: 'Legal', status: 'current', expires_at: '', notes: '', access_overrides: {}, release_timing: 'default' }
  const [showUpload, setShowUpload] = useState(false)
  const [editingDocument, setEditingDocument] = useState(null)
  const [viewingDoc, setViewingDoc] = useState(null)
  const [file, setFile] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [formError, setFormError] = useState(null)

  // AI document scanning (Feature 2)
  const [aiScanning, setAiScanning] = useState(false)
  const [aiScanDone, setAiScanDone] = useState(false)

  const handleFileSelect = (f) => {
    setFile(f)
    setForm(p => ({ ...p, name: p.name || f.name.replace(/\.[^.]+$/, '') }))
    setAiScanDone(false)
  }

  const handleAIScan = async () => {
    if (!file) return
    // Respect the AI master switch — never scan when AI is off.
    if (profile?.ai_features_enabled === false) return
    setAiScanning(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1]
        const mimeType = file.type || 'application/octet-stream'
        const supported = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!supported.includes(mimeType)) {
          setAiScanning(false)
          return
        }
        try {
          const { supabase: sb } = await import('../../../lib/supabase')
          const { data: { session } } = await sb.auth.getSession()
          const res = await fetch('/api/ai/extract-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
            body: JSON.stringify({ fileBase64: base64, mimeType, fileName: file.name }),
          })
          const data = await res.json()
          if (data.extracted) {
            const ex = data.extracted
            // Build enriched notes from AI-extracted fields the form has no dedicated input for
            const extraLines = [
              ex.provider      && t('documents.ai.providerLine', { value: ex.provider }),
              ex.accountNumber && t('documents.ai.accountLine', { value: ex.accountNumber }),
              ex.value         && t('documents.ai.valueLine', { value: ex.value }),
              ex.notes,
            ].filter(Boolean).join('\n')
            setForm(p => ({
              ...p,
              name: ex.documentName || p.name,
              doc_type: ex.documentType ? normaliseDocType(ex.documentType.replace(/_/g, ' ')) : p.doc_type,
              expires_at: ex.expiryDate || p.expires_at,
              notes: extraLines ? (p.notes ? p.notes + '\n' + extraLines : extraLines) : p.notes,
            }))
            setAiScanDone(true)
          }
        } catch {}
        setAiScanning(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setAiScanning(false)
    }
  }

  // Will & solicitor details
  const [willForm, setWillForm] = useState({
    will_location:    profile?.will_location    ?? '',
    solicitor_name:   profile?.solicitor_name   ?? '',
    solicitor_firm:   profile?.solicitor_firm   ?? '',
    solicitor_contact: profile?.solicitor_contact ?? '',
  })
  const [willSaving, setWillSaving] = useState(false)
  const [willSaved,  setWillSaved]  = useState(false)

  const handleWillSave = async (e) => {
    e.preventDefault()
    if (!updateProfile) return
    setWillSaving(true)
    try { await updateProfile(willForm); setWillSaved(true); setTimeout(() => setWillSaved(false), 2500) }
    catch {}
    finally { setWillSaving(false) }
  }

  const closeModal = () => {
    setShowUpload(false)
    setEditingDocument(null)
    setFile(null)
    setForm(emptyForm)
    setFormError(null)
  }

  const openUpload = () => {
    setEditingDocument(null)
    setFile(null)
    setForm(emptyForm)
    setShowUpload(true)
  }

  const openEdit = (doc) => {
    setShowUpload(false)
    setEditingDocument(doc)
    setFile(null)
    setForm({
      name: doc.name || '',
      doc_type: doc.doc_type || 'Legal',
      status: doc.status || 'current',
      expires_at: doc.expires_at || '',
      notes: doc.notes || '',
      access_overrides: doc.access_overrides || {},
      release_timing: doc.release_timing || 'default',
    })
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return
    setSaving(true)
    setFormError(null)
    try {
      // Clamp doc_type to an allowed value (defence in depth — the AI scan or a stale
      // form value could otherwise send a type the CHECK constraint rejects).
      await uploadFile({ ...form, doc_type: normaliseDocType(form.doc_type) }, file)
      // Life event prompt — will and LPA uploads are key estate planning moments
      const lowerType = form.doc_type?.toLowerCase() ?? ''
      if (lowerType.includes('will')) {
        onLifeEvent?.({
          message: t('documents.willLifeEvent'),
          cta: { label: t('documents.reviewInstructions'), section: 'instructions' },
        })
      } else if (lowerType.includes('lpa')) {
        onLifeEvent?.({
          message: t('documents.lpaLifeEvent'),
          cta: { label: t('documents.reviewContacts'), section: 'people' },
        })
      }
      // Feature 6: Smart expiry alert creation
      if (form.expires_at && addAlert) {
        const expiryDate = new Date(form.expires_at)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const daysUntilExpiry = Math.ceil((expiryDate - today) / 86400000)
        if (daysUntilExpiry > 0 && daysUntilExpiry <= 90) {
          const severity = daysUntilExpiry <= 30 ? 'critical' : 'warning'
          const fmtDate = expiryDate.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
          // Column is `detail` (there is no `message` column — the insert was
          // silently rejected for as long as this feature existed); category
          // 'documents' matches the expiry cron's dedup filter.
          await addAlert({
            title: t('documents.expiryAlertTitle', { name: form.name || t('documents.docFallbackName') }),
            detail: t('documents.expiryAlertDetail', { name: form.name || t('documents.docFallbackNameLower'), date: fmtDate }),
            severity,
            category: 'documents',
          }).catch(err => console.error('expiry alert failed:', err?.message))
        }
      }
      closeModal()
    } catch (err) {
      setFormError(friendlyLimitError(err, t('documents.uploadError')))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await update(editingDocument.id, {
        name: form.name,
        doc_type: normaliseDocType(form.doc_type),
        status: form.status,
        expires_at: form.expires_at || null,
        notes: form.notes,
        access_overrides: form.access_overrides || {},
        release_timing: form.release_timing || 'default',
      })
      // Feature 6: also create expiry alert when editing adds/changes an expiry date
      const prevExpiry = editingDocument.expires_at
      if (form.expires_at && form.expires_at !== prevExpiry && addAlert) {
        const expiryDate = new Date(form.expires_at)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const daysUntilExpiry = Math.ceil((expiryDate - today) / 86400000)
        if (daysUntilExpiry > 0 && daysUntilExpiry <= 90) {
          const severity = daysUntilExpiry <= 30 ? 'critical' : 'warning'
          const fmtDate = expiryDate.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
          // Column is `detail` (there is no `message` column — the insert was
          // silently rejected for as long as this feature existed); category
          // 'documents' matches the expiry cron's dedup filter.
          await addAlert({
            title: t('documents.expiryAlertTitle', { name: form.name || t('documents.docFallbackName') }),
            detail: t('documents.expiryAlertDetail', { name: form.name || t('documents.docFallbackNameLower'), date: fmtDate }),
            severity,
            category: 'documents',
          }).catch(err => console.error('expiry alert failed:', err?.message))
        }
      }
      closeModal()
    } catch (err) {
      setFormError(err.message ?? t('documents.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const atDocLimit = isAtLimit(profile?.plan, 'maxDocuments', documents.length)

  return (
    <SectionShell
      title={t('documents.title')}
      subtitle={t('documents.subtitle', { count: documents.filter(d => d.status !== 'missing').length })}
      action={
        <button onClick={atDocLimit ? undefined : openUpload} disabled={atDocLimit} className={primaryBtn} style={atDocLimit ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
          <Upload size={15} />{t('documents.uploadDocument')}
        </button>
      }
    >
      {/* Storage usage bar */}
      {planLimits && (() => {
        const limitGB = planLimits.storageGb
        // Demo: estimate ~0.5 MB per uploaded doc; real mode: sum storage_size fields
        const usedMB = documents.filter(d => d.file_url || d.storage_path).length * 0.5
        const usedGB = usedMB / 1024
        const pct    = Math.min(100, (usedGB / limitGB) * 100)
        const warn   = pct >= 80
        return (
          <div className="mb-5 bg-white border border-stone-200 rounded-xl px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-stone-600">{t('documents.storage')}</p>
              <p className={`text-xs font-medium ${warn ? 'text-amber-600' : 'text-stone-400'}`}>
                {t('documents.storageUsed', {
                  used: usedMB < 1 ? t('documents.kb', { n: (usedMB * 1024).toFixed(0) }) : t('documents.mb', { n: usedMB.toFixed(1) }),
                  limit: limitGB,
                })}
              </p>
            </div>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${warn ? 'bg-amber-400' : 'bg-navy-600'}`}
                style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
              />
            </div>
            {warn && (
              <p className="text-xs text-amber-600 mt-1.5">{t('documents.storageWarn')}</p>
            )}
          </div>
        )
      })()}
      {atDocLimit && (
        <PlanLimitNotice
          plan={profile?.plan}
          limit={getLimit(profile?.plan, 'maxDocuments')}
          noun="document"
          benefit={t('documents.limitBenefit')}
          onUpgrade={onUpgrade}
        />
      )}
      {/* Will & LPA guidance — always visible until user has uploaded both */}
      {(() => {
        const hasWill = documents.some(d => /will|testament/i.test(d.name + ' ' + (d.notes || '')))
        const hasLPA  = documents.some(d => /lpa|lasting power|attorney/i.test(d.name + ' ' + (d.notes || '')))
        if (hasWill && hasLPA) return null
        return (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-3">{t('documents.priority.title')}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {!hasWill && (
                <div className="bg-white rounded-xl border border-amber-100 p-4">
                  <p className="font-semibold text-navy-900 text-sm mb-1">{t('documents.priority.willTitle')}</p>
                  <p className="text-xs text-stone-500 mb-3 leading-relaxed">{t('documents.priority.willBody')}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={openUpload} className="text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-200 px-3 py-1.5 rounded-full hover:bg-navy-100 transition-colors">{t('documents.priority.uploadYours')}</button>
                    <a href={PRIORITY_GUIDANCE[i18n.language === 'fr' ? 'fr' : 'en'].will} target="_blank" rel="noopener noreferrer" className="text-xs text-stone-400 hover:text-navy-600 transition-colors">{t('documents.priority.govGuidance')}</a>
                  </div>
                </div>
              )}
              {!hasLPA && (
                <div className="bg-white rounded-xl border border-amber-100 p-4">
                  <p className="font-semibold text-navy-900 text-sm mb-1">{t('documents.priority.lpaTitle')}</p>
                  <p className="text-xs text-stone-500 mb-3 leading-relaxed">{t('documents.priority.lpaBody')}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={openUpload} className="text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-200 px-3 py-1.5 rounded-full hover:bg-navy-100 transition-colors">{t('documents.priority.uploadYours')}</button>
                    <a href={PRIORITY_GUIDANCE[i18n.language === 'fr' ? 'fr' : 'en'].lpa} target="_blank" rel="noopener noreferrer" className="text-xs text-stone-400 hover:text-navy-600 transition-colors">{t('documents.priority.govGuidance')}</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Will & solicitor details */}
      <div className="mb-5 bg-white border border-stone-200 rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <BookOpen size={13} className="text-navy-600" /> {t('documents.will.title')}
        </h3>
        <p className="text-xs text-stone-400 mb-4 leading-relaxed">
          {t('documents.will.subtitle')}
        </p>
        <form onSubmit={handleWillSave} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{t('documents.will.locationLabel')}</label>
            <input
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300"
              value={willForm.will_location}
              onChange={e => setWillForm(p => ({ ...p, will_location: e.target.value }))}
              placeholder={t('documents.will.locationPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{t('documents.will.solicitorName')}</label>
            <input
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300"
              value={willForm.solicitor_name}
              onChange={e => setWillForm(p => ({ ...p, solicitor_name: e.target.value }))}
              placeholder={t('documents.will.solicitorNamePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{t('documents.will.firmName')}</label>
            <input
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300"
              value={willForm.solicitor_firm}
              onChange={e => setWillForm(p => ({ ...p, solicitor_firm: e.target.value }))}
              placeholder={t('documents.will.firmPlaceholder')}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{t('documents.will.contactLabel')}</label>
            <input
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300"
              value={willForm.solicitor_contact}
              onChange={e => setWillForm(p => ({ ...p, solicitor_contact: e.target.value }))}
              placeholder={t('documents.will.contactPlaceholder')}
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={willSaving || !updateProfile}
              className="inline-flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              {willSaving ? t('documents.saving') : willSaved ? t('documents.will.savedTick') : t('documents.will.saveDetails')}
            </button>
            {willSaved && <span className="text-xs text-emerald-600 font-medium">{t('documents.will.detailsSaved')}</span>}
          </div>
        </form>
      </div>

      {loading ? <LoadingSpinner /> : documents.length === 0 ? (
        <EmptyState icon={FileText} label={t('documents.empty')} action={t('documents.emptyAction')} onAction={atDocLimit ? undefined : openUpload} />
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-stone-100">
                {[t('documents.table.document'), t('documents.table.type'), t('documents.table.status'), t('documents.table.lastUpdated'), t('documents.table.access'), ''].map(h => (
                  <th key={h} scope="col" className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <FileText size={15} className="text-stone-400 shrink-0" />
                      <div>
                        <span className="font-medium text-navy-800 block">{doc.name}</span>
                        {doc.notes && <span className="text-xs text-stone-400 block mt-0.5 truncate max-w-xs">{doc.notes}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-stone-500">{t(`documents.type.${doc.doc_type}`, { defaultValue: doc.doc_type })}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[doc.status] ?? STATUS_STYLES.current}`}>
                      {t(`documents.status.${doc.status}`, { defaultValue: doc.status })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-stone-400 text-xs">
                    {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString(dateLocale, { day:'numeric', month:'short', year:'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-stone-400 text-xs">{t('documents.owner')}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className={`p-1.5 transition-colors rounded hover:bg-navy-50 ${doc.file_url || doc.storage_path ? 'text-stone-400 hover:text-navy-600' : 'text-stone-200 cursor-default'}`}
                        aria-label={t('documents.previewAria', { name: doc.name })}
                        title={doc.file_url || doc.storage_path ? t('documents.previewTitle') : t('documents.noFileYet')}
                      >
                        <Eye size={14} />
                      </button>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          download={doc.name}
                          className="p-1.5 text-stone-400 hover:text-navy-600 transition-colors rounded hover:bg-navy-50"
                          aria-label={t('documents.downloadAria', { name: doc.name })}
                          title={t('documents.viewer.download')}
                        >
                          <Download size={14} />
                        </a>
                      )}
                      <button onClick={() => openEdit(doc)} className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded hover:bg-navy-50" aria-label={t('documents.editAria', { name: doc.name })}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => remove(doc.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded hover:bg-red-50" aria-label={t('documents.deleteAria', { name: doc.name })}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewingDoc && <OwnerDocViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />}

      {showUpload && (
        <Modal title={t('documents.uploadDocument')} onClose={closeModal}>
          <form onSubmit={handleUpload} className="space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f) }}
              onClick={() => document.getElementById('doc-file').click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-navy-400 bg-navy-50' : 'border-stone-200 hover:border-navy-300'}`}
            >
              <Upload size={22} className="text-stone-300 mx-auto mb-2" />
              {file ? (
                <p className="text-sm text-navy-700 font-medium">{t('documents.fileSelected', { name: file.name, size: (file.size / 1024).toFixed(0) })}</p>
              ) : (
                <p className="text-sm text-stone-400">{t('documents.dropHere')}<br /><span className="text-xs">{t('documents.dropFormats')}</span></p>
              )}
              <input id="doc-file" type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt" onChange={e => { const f = e.target.files[0]; if (f) handleFileSelect(f) }} />
            </div>

            {/* AI scan offer — shown when a scannable file is selected */}
            {file && ['application/pdf','image/jpeg','image/jpg','image/png','image/webp'].includes(file.type) && !aiScanDone && (
              <div className="flex items-center justify-between bg-sage-50 border border-sage-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-sage-600" />
                  <p className="text-xs text-sage-800 font-medium">{t('documents.ai.offer')}</p>
                </div>
                <button
                  type="button"
                  onClick={handleAIScan}
                  disabled={aiScanning}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 bg-white border border-sage-300 px-3 py-1.5 rounded-full hover:bg-sage-50 transition-colors disabled:opacity-50"
                >
                  {aiScanning ? <><Loader2 size={12} className="animate-spin" />{t('documents.ai.scanning')}</> : t('documents.ai.scan')}
                </button>
              </div>
            )}
            {aiScanDone && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <CheckCircle2 size={13} /> {t('documents.ai.done')}
              </p>
            )}
            <Field label={t('documents.fields.name')} required>
              <input className={input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('documents.fields.namePlaceholder')} required />
            </Field>
            <Field label={t('documents.fields.type')}>
              <select className={input} value={form.doc_type} onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))}>
                {/* doc_type VALUES are DB CHECK-constraint values and stay English; only labels translate. */}
                {['Legal','Finance','Insurance','Property','Personal','Medical','Other'].map(dt => <option key={dt} value={dt}>{t(`documents.type.${dt}`, { defaultValue: dt })}</option>)}
              </select>
            </Field>
            <Field label={t('documents.fields.notes')}>
              <textarea className={input} rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('documents.fields.notesPlaceholder')} />
            </Field>
            <Field label={t('documents.fields.expiry')}>
              <input type="date" className={input} value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
            </Field>
            <DocumentAccessEditor people={people} form={form} setForm={setForm} />
            {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving || !file} className={`${primaryBtn} flex-1 disabled:opacity-50`}>
                {saving ? t('documents.uploading') : t('documents.upload')}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>{t('documents.cancel')}</button>
            </div>
          </form>
        </Modal>
      )}

      {editingDocument && (
        <Modal title={t('documents.editDocument')} onClose={closeModal}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label={t('documents.fields.name')} required>
              <input className={input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('documents.fields.type')}>
                <select className={input} value={form.doc_type} onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))}>
                  {/* doc_type VALUES are DB CHECK-constraint values and stay English; only labels translate. */}
                  {['Legal','Finance','Insurance','Property','Personal','Medical','Other'].map(dt => <option key={dt} value={dt}>{t(`documents.type.${dt}`, { defaultValue: dt })}</option>)}
                </select>
              </Field>
              <Field label={t('documents.fields.status')}>
                <select className={input} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {/* Stored status VALUES stay English; only labels translate. */}
                  {['current', 'expiring', 'missing', 'expired'].map(option => <option key={option} value={option}>{t(`documents.status.${option}`, { defaultValue: option })}</option>)}
                </select>
              </Field>
            </div>
            <Field label={t('documents.fields.notes')}>
              <textarea className={input} rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </Field>
            <Field label={t('documents.fields.expiry')}>
              <input type="date" className={input} value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
            </Field>
            <DocumentAccessEditor people={people} form={form} setForm={setForm} />
            {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? t('documents.saving') : t('documents.saveChanges')}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>{t('documents.cancel')}</button>
            </div>
          </form>
        </Modal>
      )}
    </SectionShell>
  )
}
// ─────────────────────────────────────────────────────────────
// ABOUT ME SECTION
// ─────────────────────────────────────────────────────────────
// Roles that should NOT see a personal "About Me" — professional/legal contacts.
// (Old spellings kept for any rows saved before the UK-terminology rename.)

export const DOC_TYPES = ['Legal', 'Finance', 'Insurance', 'Property', 'Personal', 'Medical', 'Other']

// Map a free-form document type — e.g. a value the AI document scan extracts
// ("pension_transfer", "questionnaire", "financial") — onto one of DOC_TYPES. Anything
// unrecognised falls back to 'Other'. Without this, an AI-set doc_type that isn't in the
// list silently fails to match the dropdown AND is rejected by the CHECK constraint on save.

export const normaliseDocType = (raw) => {
  if (!raw) return 'Other'
  const s = String(raw).toLowerCase().trim()
  const exact = DOC_TYPES.find(t => t.toLowerCase() === s)
  if (exact) return exact
  if (/legal|will|testament|lpa|attorney|probate|deed of|contract|agreement|questionnaire|transfer/.test(s)) return 'Legal'
  if (/financ|bank|pension|invest|isa|savings|statement|tax|payslip/.test(s)) return 'Finance'
  if (/insur|policy|annuity/.test(s)) return 'Insurance'
  if (/propert|title|land regist|lease|mortgage/.test(s)) return 'Property'
  if (/medic|health|prescription|nhs|hospital|doctor/.test(s)) return 'Medical'
  if (/passport|licen|identity|birth|marriage|personal/.test(s)) return 'Personal'
  return 'Other'
}

// ── First-run tour: a short, warm walk through the real dashboard ─────────────
