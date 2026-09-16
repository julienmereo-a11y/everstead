// Everyone this organisation has been in touch with, and what happened.
//
// The line this screen walks, deliberately: an organisation sees ITS OWN
// correspondence. They typed the address, they sent the document, they made the
// request, so none of that is news to them. What they never see is anything
// about the person's side: whether they keep an Everstead vault, what is in it,
// or anything they did not themselves put in motion.
//
// That is why the columns are counts of sent, asked and waiting, and why there
// is no "has an account" column. The employers page promises an organisation
// learns how many people started and nothing else, and a per-person account
// flag would quietly break it.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Clock, Loader2, Search, ShieldCheck } from 'lucide-react'

const fmt = (iso) => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' } }

const DEMO = [
  { email: 'aisha.mensah@marlowfinch.example', sent: 4, asked: 1, waiting: 0, last: '2026-09-15T09:41:00Z' },
  { email: 'tom.baptiste@marlowfinch.example', sent: 2, asked: 2, waiting: 0, last: '2026-09-14T16:22:00Z' },
  { email: 'greg.oyelaran@marlowfinch.example', sent: 3, asked: 0, waiting: 0, last: '2026-09-12T12:02:00Z' },
  { email: 'nina.kovacs@marlowfinch.example', sent: 1, asked: 1, waiting: 1, last: '2026-09-11T09:05:00Z' },
  { email: 'sam.devlin@marlowfinch.example', sent: 2, asked: 0, waiting: 1, last: '2026-09-09T14:45:00Z' },
  { email: 'priya.raman@marlowfinch.example', sent: 1, asked: 1, waiting: 0, last: '2026-09-04T09:10:00Z' },
]

export function PeopleScreen({ firm, isDemo, go }) {
  const [rows, setRows] = useState(isDemo ? DEMO : [])
  const [loading, setLoading] = useState(!isDemo)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    if (isDemo) { setRows(DEMO); setLoading(false); return }
    if (!firm?.id) { setLoading(false); return }
    const { supabase } = await import('../../lib/supabase')
    const [d, r] = await Promise.all([
      supabase.from('inbound_deliveries').select('recipient_email, status, sent_at, responded_at').eq('org_id', firm.id).limit(2000),
      supabase.from('adviser_document_requests').select('recipient_email, status, created_at, updated_at').eq('adviser_id', firm.id).limit(2000),
    ])
    const by = new Map()
    const touch = (email, at) => {
      const k = (email || '').toLowerCase()
      if (!k) return null
      if (!by.has(k)) by.set(k, { email: k, sent: 0, asked: 0, waiting: 0, last: at })
      const row = by.get(k)
      if (at && (!row.last || new Date(at) > new Date(row.last))) row.last = at
      return row
    }
    for (const x of d.data || []) {
      const row = touch(x.recipient_email, x.responded_at || x.sent_at)
      if (!row) continue
      row.sent += 1
      if (x.status === 'sent') row.waiting += 1
    }
    for (const x of r.data || []) {
      const row = touch(x.recipient_email, x.updated_at || x.created_at)
      if (!row) continue
      row.asked += 1
      if (x.status === 'requested') row.waiting += 1
    }
    setRows([...by.values()].sort((a, b) => new Date(b.last) - new Date(a.last)))
    setLoading(false)
  }, [firm?.id, isDemo])

  useEffect(() => { load() }, [load])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? rows.filter(r => r.email.includes(needle)) : rows
  }, [rows, q])

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-stone-300" /></div>

  const waiting = rows.reduce((n, r) => n + (r.waiting > 0 ? 1 : 0), 0)

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl font-light text-navy-950 m-0">People</h1>
      <p className="text-stone-500 text-sm mt-1 mb-6 max-w-2xl">
        Everyone you have sent something to or asked something of.
        {waiting > 0 ? ` ${waiting} ${waiting === 1 ? 'person has' : 'people have'} something still waiting on them.` : ' Nothing is waiting on anyone.'}
      </p>

      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-xs text-stone-400 m-0">{rows.length} {rows.length === 1 ? 'person' : 'people'}</p>
        <span className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find someone"
            className="w-56 border border-stone-200 rounded-full pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-navy-300" />
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-stone-400 py-8">
          Nobody yet. <button onClick={() => go?.('send')} className="font-semibold text-navy-700 hover:text-navy-900">Send a document</button> to start.
        </p>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr className="text-left text-xs font-semibold text-stone-500">
                <th className="px-4 py-2.5">Person</th>
                <th className="px-4 py-2.5">Sent to them</th>
                <th className="px-4 py-2.5">Asked of them</th>
                <th className="px-4 py-2.5">Waiting</th>
                <th className="px-4 py-2.5">Last contact</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(r => (
                <tr key={r.email} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 text-navy-950">{r.email}</td>
                  <td className="px-4 py-3 text-stone-600">
                    <span className="inline-flex items-center gap-1.5"><ArrowUpRight size={13} className="text-navy-600" />{r.sent}</span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    <span className="inline-flex items-center gap-1.5"><ArrowDownLeft size={13} className="text-sage-600" />{r.asked}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.waiting > 0
                      ? <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full border bg-amber-50 text-amber-800 border-amber-200"><Clock size={11} />{r.waiting}</span>
                      : <span className="text-xs text-stone-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-stone-400 text-xs whitespace-nowrap">{fmt(r.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-5">
        <ShieldCheck size={17} className="text-sage-600 shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed text-stone-600 m-0">
          This is your own correspondence: who you contacted, what you sent, what you asked for, and whether it was
          answered. It does not tell you whether any of them keeps an Everstead vault, and it never shows what is in one.
        </p>
      </div>
    </div>
  )
}
