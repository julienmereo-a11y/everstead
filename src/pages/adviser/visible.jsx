// Portal screen: "What you can see right now."
//
// Every other product in this category can show you a list of what it HOLDS.
// This shows a list of what you can SEE, and every line has a day on it. The
// difference matters most when the list is empty, because an empty list here is
// a true statement about your exposure rather than a filter that found nothing.
//
// Three deliberate choices:
//   - sorted by what disappears soonest, because that is the only ordering
//     anyone acts on
//   - the day is spelled out, not a relative "30 days", because people write
//     the date down
//   - every row can be given up early, which costs an organisation nothing and
//     is the cheapest possible proof that access here is really one-directional
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, Eye, Infinity as InfinityIcon, Loader2, ShieldCheck } from 'lucide-react'
import { apiPost } from '../../lib/platform'

const day = (iso) => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '' } }
const daysLeft = (iso) => Math.ceil((new Date(iso) - Date.now()) / 86400000)

const DEMO = [
  { id: 'v1', member_email: 'tom.baptiste@marlowfinch.example', resource_name: 'Proof of address, council tax bill', asked_for: 'Proof of address',      granted_at: '2026-09-14T16:22:00Z', expires_at: '2026-09-18T16:22:00Z' },
  { id: 'v2', member_email: 'aisha.mensah@marlowfinch.example', resource_name: 'Passport photo page',                asked_for: 'Right to work document', granted_at: '2026-09-02T09:10:00Z', expires_at: '2026-10-02T09:10:00Z' },
  { id: 'v3', member_email: 'greg.oyelaran@marlowfinch.example', resource_name: 'Bank statement, August',            asked_for: 'Bank details',           granted_at: '2026-08-28T11:00:00Z', expires_at: '2026-11-26T11:00:00Z' },
  { id: 'v4', member_email: 'nina.kovacs@marlowfinch.example',  resource_name: 'Pension nomination form',            asked_for: 'Pension nomination',     granted_at: '2026-08-20T08:00:00Z', expires_at: null },
]

export function VisiblePanel({ firm, isDemo }) {
  const [rows, setRows] = useState(isDemo ? DEMO : [])
  const [loading, setLoading] = useState(!isDemo)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (isDemo) { setRows(DEMO); setLoading(false); return }
    if (!firm?.id) { setLoading(false); return }
    const { supabase } = await import('../../lib/supabase')
    const { data, error: err } = await supabase.rpc('get_org_live_shares', { p_org_id: firm.id })
    if (err) setError('Could not load this just now.')
    setRows(data || [])
    setLoading(false)
  }, [firm?.id, isDemo])

  useEffect(() => { load() }, [load])

  const release = async (id) => {
    setBusy(id); setError(null)
    try {
      const { supabase } = await import('../../lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const res = await apiPost('/api/org/offboard', { orgId: firm.id, shareId: id },
        { Authorization: `Bearer ${session?.access_token || ''}` })
      if (!res.ok) throw new Error(res.data?.error || 'Could not do that.')
      setRows(rs => rs.filter(r => r.id !== id))
    } catch (err) { setError(err.message) } finally { setBusy(null) }
  }

  // Anything inside a week is what someone is going to chase, so it gets to go
  // at the top of the page as a number rather than as a row to be counted.
  const soon = useMemo(() => rows.filter(r => r.expires_at && daysLeft(r.expires_at) <= 7).length, [rows])

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-stone-300" /></div>

  return (
    <div>
      <p className="text-stone-500 text-sm mb-5 max-w-2xl">
        Everything you can open right now, and the day each one closes. Nothing else in anyone's vault is visible to you,
        and you never have to delete any of it, because none of it is stored here by you.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Items you can see', value: rows.length, Icon: Eye },
          { label: 'Closing this week', value: soon, Icon: CalendarClock },
          { label: 'Documents you store', value: 0, Icon: ShieldCheck },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-2xl border border-stone-200 bg-white p-4">
            <Icon size={15} className="text-stone-400 mb-2" />
            <p className="font-display text-2xl font-light text-navy-950 m-0 leading-none">{value}</p>
            <p className="text-xs text-stone-500 mt-1.5 m-0">{label}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-sage-200 bg-sage-50 p-6">
          <ShieldCheck size={18} className="text-sage-600 mb-2" />
          <p className="text-sm font-semibold text-navy-950 m-0">You cannot see anything at the moment.</p>
          <p className="text-sm text-stone-600 mt-1 m-0">
            That is the normal state between pieces of work. Ask for a document and it appears here until the day it closes.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[42rem]">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr className="text-left text-xs font-semibold text-stone-500">
                <th className="px-4 py-2.5">Person</th>
                <th className="px-4 py-2.5">Document</th>
                <th className="px-4 py-2.5">Closes</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map(r => {
                const left = r.expires_at ? daysLeft(r.expires_at) : null
                return (
                  <tr key={r.id} className="hover:bg-stone-50/60">
                    <td className="px-4 py-3 text-navy-900 break-all">{r.member_email}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {r.resource_name || r.asked_for || 'Document'}
                      {r.asked_for && r.resource_name && <span className="block text-xs text-stone-400">Asked for: {r.asked_for}</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.expires_at ? (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${
                          left <= 7 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-stone-50 text-stone-600 border-stone-200'
                        }`}>
                          <CalendarClock size={11} />{day(r.expires_at)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border bg-stone-50 text-stone-500 border-stone-200">
                          <InfinityIcon size={11} />Until they stop it
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button disabled={busy === r.id || isDemo} onClick={() => release(r.id)}
                        title="Close this now, before the date"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-navy-800 disabled:opacity-50 transition-colors">
                        {busy === r.id ? <Loader2 size={11} className="animate-spin" /> : null}
                        Close it now
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
