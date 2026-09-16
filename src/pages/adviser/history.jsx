// Everything that has moved between this organisation and a person, in one
// list, both directions.
//
// Sent and asked used to live in separate tables under their own tabs, which
// answered "what did I send" and "what did I ask for" but never "what happened
// with this person". A single ledger sorted by date is what you actually want
// open when someone calls.
//
// Status is the honest outcome in both directions, including the ones that are
// not wins: declined and expired say so.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Ban, CheckCircle2, Clock, Loader2, Search } from 'lucide-react'
import { ReceiptButton } from './receipt'

const STATUS = {
  waiting:   { label: 'Waiting',   cls: 'bg-amber-50 text-amber-800 border-amber-200',   Icon: Clock },
  // Received, not HOW. Whether someone kept it in an Everstead vault or took a
  // copy and left tells you whether they have an account, and the employers
  // page promises an organisation learns how many people started and nothing
  // else. Delivery is what a sender legitimately needs to know.
  received:  { label: 'Received',  cls: 'bg-sage-50 text-sage-700 border-sage-200',      Icon: CheckCircle2 },
  shared:    { label: 'Shared with you', cls: 'bg-sage-50 text-sage-700 border-sage-200', Icon: CheckCircle2 },
  declined:  { label: 'Declined',  cls: 'bg-stone-100 text-stone-600 border-stone-200',  Icon: Ban },
  expired:   { label: 'Expired',   cls: 'bg-stone-100 text-stone-500 border-stone-200',  Icon: Clock },
}

const DELIVERY_STATUS = { sent: 'waiting', accepted: 'received', downloaded: 'received', declined: 'declined', expired: 'expired' }
const REQUEST_STATUS  = { requested: 'waiting', uploaded: 'shared', reviewed: 'shared', stored: 'shared', cancelled: 'declined' }

const fmt = (iso) => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' } }

// The demo portal quotes real-looking totals, so an empty ledger underneath
// them reads as broken. These cover every status the table can show, including
// the ones that are not wins.
const DEMO_ROWS = [
  { key: 'd1', kind: 'delivery', direction: 'out', person: 'aisha.mensah@marlowfinch.example', what: 'Employment contract, 2026 revision', at: '2026-09-15T08:15:00Z', answeredAt: '2026-09-15T09:41:00Z', status: 'received' },
  { key: 'r1', kind: 'share',    direction: 'in',  person: 'tom.baptiste@marlowfinch.example', what: 'Proof of address',                 at: '2026-09-14T10:00:00Z', answeredAt: '2026-09-14T16:22:00Z', status: 'shared' },
  { key: 'd2', kind: 'delivery', direction: 'out', person: 'greg.oyelaran@marlowfinch.example', what: 'Pension scheme summary',          at: '2026-09-12T11:30:00Z', answeredAt: '2026-09-12T12:02:00Z', status: 'received' },
  { key: 'r2', kind: 'share',    direction: 'in',  person: 'nina.kovacs@marlowfinch.example',  what: 'Right to work document',           at: '2026-09-11T09:05:00Z', answeredAt: null,                   status: 'waiting' },
  { key: 'd3', kind: 'delivery', direction: 'out', person: 'sam.devlin@marlowfinch.example',   what: 'Letter of engagement',             at: '2026-09-09T14:45:00Z', answeredAt: null,                   status: 'waiting' },
  { key: 'r3', kind: 'share',    direction: 'in',  person: 'priya.raman@marlowfinch.example',  what: 'Bank details',                     at: '2026-09-04T08:20:00Z', answeredAt: '2026-09-04T09:10:00Z', status: 'declined' },
  { key: 'd4', kind: 'delivery', direction: 'out', person: 'leaver@marlowfinch.example',       what: 'P45',                              at: '2026-07-02T07:00:00Z', answeredAt: null,                   status: 'expired' },
].map(r => ({ ...r, row: { id: `demo-${r.key}`, recipient_email: r.person, title: r.what, doc_type: r.what, sent_at: r.at, created_at: r.at, responded_at: r.answeredAt, uploaded_at: r.answeredAt, status: r.status, expires_days: r.direction === 'in' ? 30 : null } }))

export function HistoryPanel({ firm, isDemo }) {
  const [rows, setRows] = useState(isDemo ? DEMO_ROWS : [])
  const [loading, setLoading] = useState(!isDemo)
  const [dir, setDir] = useState('all')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    if (isDemo) { setRows(DEMO_ROWS); setLoading(false); return }
    if (!firm?.id) { setLoading(false); return }
    const { supabase } = await import('../../lib/supabase')
    const [sent, asked] = await Promise.all([
      supabase.from('inbound_deliveries')
        .select('id, recipient_email, title, doc_type, status, sent_at, responded_at, downloaded_at, claim_verified_at, sender_name')
        .eq('org_id', firm.id).order('sent_at', { ascending: false }).limit(200),
      supabase.from('adviser_document_requests')
        .select('id, recipient_email, doc_type, note, status, expires_days, created_at, updated_at, uploaded_at, sender_name')
        .eq('adviser_id', firm.id).order('created_at', { ascending: false }).limit(200),
    ])
    const out = [
      ...(sent.data || []).map(r => ({
        key: `d:${r.id}`, kind: 'delivery', direction: 'out', row: r,
        person: r.recipient_email, what: r.title,
        at: r.sent_at, answeredAt: r.responded_at || r.downloaded_at,
        status: DELIVERY_STATUS[r.status] || 'waiting',
      })),
      ...(asked.data || []).map(r => ({
        key: `r:${r.id}`, kind: 'share', direction: 'in', row: r,
        person: r.recipient_email, what: r.doc_type,
        at: r.created_at, answeredAt: r.uploaded_at,
        status: REQUEST_STATUS[r.status] || 'waiting',
      })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at))
    setRows(out)
    setLoading(false)
  }, [firm?.id, isDemo])

  useEffect(() => { load() }, [load])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter(r =>
      (dir === 'all' || r.direction === dir) &&
      (!needle || `${r.person} ${r.what}`.toLowerCase().includes(needle)))
  }, [rows, dir, q])

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-stone-300" /></div>

  return (
    <div>
      <p className="text-stone-500 text-sm mb-5 max-w-2xl">
        Everything that has moved between you and the people you serve, in both directions. You never see anything else in their vault.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[['all', 'Everything'], ['out', 'Sent'], ['in', 'Asked for']].map(([id, label]) => (
          <button key={id} onClick={() => setDir(id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              dir === id ? 'bg-navy-800 text-white border-navy-800' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
            }`}>{label}</button>
        ))}
        <span className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a person or a document"
            className="w-56 border border-stone-200 rounded-full pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-navy-300" />
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-stone-400 py-8">Nothing here yet.</p>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[42rem]">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr className="text-left text-xs font-semibold text-stone-500">
                <th className="px-4 py-2.5">Direction</th>
                <th className="px-4 py-2.5">Person</th>
                <th className="px-4 py-2.5">Document</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map(r => {
                const s = STATUS[r.status] || STATUS.waiting
                const out = r.direction === 'out'
                return (
                  <tr key={r.key} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${out ? 'text-navy-700' : 'text-sage-700'}`}>
                        {out ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                        {out ? 'Sent' : 'Asked for'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{r.person}</td>
                    <td className="px-4 py-3 text-navy-950">{r.what}</td>
                    <td className="px-4 py-3 text-stone-400 text-xs whitespace-nowrap">
                      {fmt(r.at)}
                      {r.answeredAt && <span className="block text-[11px]">answered {fmt(r.answeredAt)}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap ${s.cls}`}>
                        <s.Icon size={11} />{s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status !== 'waiting' && <ReceiptButton kind={r.kind} row={r.row} orgName={firm?.firm_name} />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-stone-400">
"Received" means it reached them and they answered. Everstead does not tell you whether someone keeps a vault of their own; that is between them and us.
      </p>
    </div>
  )
}
