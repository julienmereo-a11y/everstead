// The employer's overview.
//
// Deliberately much smaller than the adviser one, and that IS the product. The
// employers page promises that an organisation sees take-up and never a
// per-employee row, so this screen counts and never lists. If a name ever
// appears here the claim we published stops being true.
//
// Everything on it comes from the two exchange tables, which is all an employer
// ever touches: what they sent, what they asked for, and whether it landed.
import React, { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react'

const startOfMonth = () => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d }

const DEMO = { sent: 128, landed: 111, waiting: 12, asked: 34, answered: 27, openAsks: 7, people: 96, thisMonth: 21 }

export function EmployerOverview({ firm, advisor, go, isDemo }) {
  const [s, setS] = useState(isDemo ? DEMO : null)

  const load = useCallback(async () => {
    if (isDemo || !firm?.id) return
    const { supabase } = await import('../../lib/supabase')
    const [d, r] = await Promise.all([
      supabase.from('inbound_deliveries').select('recipient_email, status, sent_at').eq('org_id', firm.id).limit(2000),
      supabase.from('adviser_document_requests').select('recipient_email, status').eq('adviser_id', firm.id).limit(2000),
    ])
    const del = d.data || [], req = r.data || []
    const since = startOfMonth()
    setS({
      sent: del.length,
      landed: del.filter(x => x.status === 'accepted' || x.status === 'downloaded').length,
      waiting: del.filter(x => x.status === 'sent').length,
      thisMonth: del.filter(x => new Date(x.sent_at) >= since).length,
      asked: req.length,
      answered: req.filter(x => ['uploaded', 'reviewed', 'stored'].includes(x.status)).length,
      openAsks: req.filter(x => x.status === 'requested').length,
      // Distinct addresses, counted and immediately discarded. Never rendered.
      people: new Set([...del, ...req].map(x => (x.recipient_email || '').toLowerCase()).filter(Boolean)).size,
    })
  }, [firm?.id, isDemo])

  useEffect(() => { load() }, [load])

  if (!s) return <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-stone-300" /></div>

  const rate = s.sent ? Math.round((s.landed / s.sent) * 100) : 0
  const stats = [
    { label: 'People reached', value: s.people, hint: 'employees who have been sent or asked for something' },
    { label: 'Documents sent', value: s.sent, hint: `${s.thisMonth} this month` },
    { label: 'Landed', value: s.sent ? `${rate}%` : '—', hint: `${s.landed} kept or downloaded, ${s.waiting} still waiting` },
    { label: 'Open requests', value: s.openAsks, hint: `${s.answered} of ${s.asked} answered` },
  ]

  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400 m-0">
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      <h1 className="mt-2 font-display text-3xl font-light text-navy-950 m-0">
        {advisor?.full_name ? `Good morning, ${String(advisor.full_name).split(' ')[0]}.` : 'Good morning.'}
      </h1>
      <p className="mt-1.5 text-sm text-stone-500">
        {s.waiting > 0 || s.openAsks > 0
          ? `${s.waiting} sent and not yet answered · ${s.openAsks} open requests`
          : 'Nothing is waiting on anyone.'}
      </p>

      <div className="mt-7 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(x => (
          <div key={x.label} className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 m-0">{x.label}</p>
            <p className="mt-1.5 font-display text-3xl font-light text-navy-950 m-0">{x.value}</p>
            <p className="mt-1 text-xs text-stone-500 m-0">{x.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={() => go('send')} className="inline-flex items-center gap-2 rounded-full bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors">
          Send a document <ArrowRight size={15} />
        </button>
        <button onClick={() => go('send')} className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white text-stone-700 text-sm font-medium px-5 py-2.5 hover:bg-stone-50 transition-colors">
          Ask for a document
        </button>
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-5">
        <ShieldCheck size={18} className="text-sage-600 shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed text-stone-600 m-0">
          These are counts, and counts are all you get. {firm?.firm_name || 'Your organisation'} cannot see what is in anyone's
          vault, or which individual did what. A document you sent belongs to the person who accepted it, including after
          they leave you.
        </p>
      </div>
    </div>
  )
}
