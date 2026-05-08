import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─────────────────────────────────────────────────────────────
// PRINT VIEW — Clean printable estate plan summary
// Route: /print (ProtectedRoute)
// Users click "Print / Save as PDF" → browser print dialog
// ─────────────────────────────────────────────────────────────

function fmt(iso) {
  if (!iso) return '—'
  try { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(iso)) } catch { return '—' }
}

export default function PrintView() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [accounts,     setAccounts]     = useState([])
  const [documents,    setDocuments]    = useState([])
  const [people,       setPeople]       = useState([])
  const [instructions, setInstructions] = useState([])
  const [wishes,       setWishes]       = useState([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }

    const id = user.id
    Promise.all([
      supabase.from('accounts')     .select('*').eq('user_id', id).order('created_at'),
      supabase.from('documents')    .select('*').eq('user_id', id).order('created_at'),
      supabase.from('trusted_people').select('*').eq('owner_id', id).order('created_at'),
      supabase.from('instructions') .select('*').eq('user_id', id).order('created_at'),
      supabase.from('wishes')       .select('*').eq('user_id', id).order('created_at'),
    ]).then(([a, d, p, i, w]) => {
      setAccounts    (a.data ?? [])
      setDocuments   (d.data ?? [])
      setPeople      (p.data ?? [])
      setInstructions(i.data ?? [])
      setWishes      (w.data ?? [])
      setLoading(false)
    })
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-stone-400 text-sm">Preparing your plan summary…</p>
      </div>
    )
  }

  const generated = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())

  return (
    <div className="bg-white min-h-screen">
      {/* Print button — hidden when printing */}
      <div className="print:hidden bg-navy-950 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-v2-white.png" alt="Everstead" className="h-7 w-auto" />
          <span className="text-stone-400 text-sm">Estate plan export</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-stone-400 hover:text-white text-sm transition-colors"
          >
            ← Back to dashboard
          </button>
          <button
            onClick={() => window.print()}
            className="bg-white text-navy-900 text-sm font-semibold px-5 py-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-12 print:py-8 print:px-6">

        {/* Header */}
        <div className="border-b-2 border-navy-950 pb-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-light text-navy-950" style={{ fontFamily: 'Georgia, serif' }}>
                Estate Plan Summary
              </h1>
              <p className="text-stone-500 mt-1 text-sm">{profile?.full_name}</p>
            </div>
            <div className="text-right text-xs text-stone-400">
              <p>Generated {generated}</p>
              <p className="mt-0.5">Everstead · everstead.care</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            {profile?.email && (
              <div><span className="text-stone-400 text-xs block">Email</span>{profile.email}</div>
            )}
            {profile?.plan && (
              <div><span className="text-stone-400 text-xs block">Plan</span><span className="capitalize">{profile.plan}</span></div>
            )}
            <div><span className="text-stone-400 text-xs block">Sections</span>{[accounts.length > 0, documents.length > 0, people.length > 0, instructions.length > 0, wishes.length > 0].filter(Boolean).length} of 5 complete</div>
          </div>
        </div>

        {/* Important notice */}
        <div className="border border-amber-300 bg-amber-50 rounded-lg px-5 py-4 mb-8 text-sm text-amber-800 print:border-stone-300 print:bg-stone-50 print:text-stone-700">
          <p className="font-semibold mb-1">For your executor and trusted people</p>
          <p>This document is a summary export from Everstead. It should be kept with your other important papers or shared securely with your executor. For the live, up-to-date version, log in at everstead.care.</p>
        </div>

        {/* ── Accounts ── */}
        <Section title="Financial Accounts" count={accounts.length}>
          {accounts.length === 0 ? <Empty>No accounts added yet.</Empty> : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-stone-200">
                  {['Account name', 'Institution', 'Type', 'Account no.', 'Est. value'].map(h => (
                    <th key={h} className="text-left text-xs text-stone-400 pb-2 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.map((a, i) => (
                  <tr key={a.id} className={i % 2 === 0 ? '' : 'bg-stone-50'}>
                    <td className="py-2 pr-4 font-medium text-navy-900">{a.name || '—'}</td>
                    <td className="py-2 pr-4 text-stone-600">{a.institution || '—'}</td>
                    <td className="py-2 pr-4 text-stone-600 capitalize">{a.account_type || '—'}</td>
                    <td className="py-2 pr-4 text-stone-600 font-mono text-xs">{a.account_number ? `••••${String(a.account_number).slice(-4)}` : '—'}</td>
                    <td className="py-2 text-stone-600">{a.estimated_value ? `£${Number(a.estimated_value).toLocaleString('en-GB')}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* ── Documents ── */}
        <Section title="Key Documents" count={documents.length}>
          {documents.length === 0 ? <Empty>No documents uploaded yet.</Empty> : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-stone-200">
                  {['Document', 'Type', 'Status', 'Expires'].map(h => (
                    <th key={h} className="text-left text-xs text-stone-400 pb-2 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map((d, i) => (
                  <tr key={d.id} className={i % 2 === 0 ? '' : 'bg-stone-50'}>
                    <td className="py-2 pr-4 font-medium text-navy-900">{d.name || '—'}</td>
                    <td className="py-2 pr-4 text-stone-600">{d.doc_type || '—'}</td>
                    <td className="py-2 pr-4 text-stone-600 capitalize">{d.status || '—'}</td>
                    <td className="py-2 text-stone-600">{fmt(d.expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* ── Trusted people ── */}
        <Section title="Trusted People" count={people.length}>
          {people.length === 0 ? <Empty>No trusted contacts added yet.</Empty> : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-stone-200">
                  {['Name', 'Email', 'Role', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs text-stone-400 pb-2 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {people.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? '' : 'bg-stone-50'}>
                    <td className="py-2 pr-4 font-medium text-navy-900">{p.full_name || '—'}</td>
                    <td className="py-2 pr-4 text-stone-600">{p.email || '—'}</td>
                    <td className="py-2 pr-4 text-stone-600 capitalize">{p.role || '—'}</td>
                    <td className="py-2 text-stone-600 capitalize">{p.invite_status || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* ── Instructions ── */}
        <Section title="Instructions" count={instructions.length}>
          {instructions.length === 0 ? <Empty>No instructions written yet.</Empty> : (
            <div className="space-y-4">
              {instructions.map(ins => (
                <div key={ins.id} className="border border-stone-200 rounded-lg p-4">
                  <p className="font-semibold text-navy-900 text-sm mb-1">{ins.title || 'Untitled'}</p>
                  {ins.category && <p className="text-xs text-stone-400 mb-2 capitalize">{ins.category}</p>}
                  {ins.content && <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">{ins.content}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Wishes ── */}
        <Section title="Wishes" count={wishes.length}>
          {wishes.length === 0 ? <Empty>No wishes recorded yet.</Empty> : (
            <div className="space-y-4">
              {wishes.map(w => (
                <div key={w.id} className="border border-stone-200 rounded-lg p-4">
                  <p className="font-semibold text-navy-900 text-sm mb-1">{w.title || 'Untitled'}</p>
                  {w.category && <p className="text-xs text-stone-400 mb-2 capitalize">{w.category}</p>}
                  {w.content && <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">{w.content}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Footer */}
        <div className="border-t border-stone-200 mt-10 pt-6 text-xs text-stone-400 flex items-center justify-between">
          <p>Everstead · everstead.care · support@everstead.care</p>
          <p>Generated {generated}</p>
        </div>
      </div>
    </div>
  )
}

function Section({ title, count, children }) {
  return (
    <div className="mb-8 break-inside-avoid-page">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-base font-semibold text-navy-950">{title}</h2>
        <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      {children}
    </div>
  )
}

function Empty({ children }) {
  return <p className="text-sm text-stone-400 italic">{children}</p>
}
