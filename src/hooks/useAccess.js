// "Who has access": every organisation connected to this member, and anything
// an organisation has sent that the member has not answered yet.
//
// Two tables, one hook, because the screen and the Overview card must never
// disagree about how many things are waiting. Nothing here can widen access:
// connections are read-only to the client (see the migration), and both writes
// go through service-role endpoints that re-check ownership.
import { useCallback, useEffect, useState } from 'react'
import { apiPost } from '../lib/platform'
import { DEMO_CONNECTIONS, DEMO_DELIVERIES } from '../lib/demoData'

const EMPTY = { connections: [], deliveries: [] }
const DEMO  = { connections: DEMO_CONNECTIONS, deliveries: DEMO_DELIVERIES }

export function useAccess(profile, isDemo) {
  const [data, setData] = useState(isDemo ? DEMO : EMPTY)
  const [loading, setLoading] = useState(!isDemo)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    if (isDemo) { setData(DEMO); setLoading(false); return }
    if (!profile?.id) { setData(EMPTY); setLoading(false); return }
    const { supabase: sb } = await import('../lib/supabase')
    const [connRes, delRes] = await Promise.all([
      sb.rpc('get_my_connections'),
      sb.from('inbound_deliveries')
        .select('id, org_id, title, doc_type, note, sender_name, mime_type, file_size, sent_at, expires_at, status')
        .eq('status', 'sent')
        .order('sent_at', { ascending: false }),
    ])
    setData({
      connections: Array.isArray(connRes.data) ? connRes.data : [],
      deliveries: Array.isArray(delRes.data) ? delRes.data : [],
    })
    setLoading(false)
  }, [profile?.id, isDemo])

  useEffect(() => { let on = true; load().catch(() => { if (on) setLoading(false) }); return () => { on = false } }, [load])

  const authHeader = async () => {
    const { supabase: sb } = await import('../lib/supabase')
    const { data: { session } } = await sb.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token || ''}` }
  }

  /** Accept a delivered document into the vault, or decline it. */
  const respond = useCallback(async (deliveryId, action) => {
    setBusyId(deliveryId)
    try {
      const res = await apiPost('/api/org/delivery-respond', { deliveryId, action }, await authHeader())
      if (!res.ok) throw new Error(res.data?.error || 'Could not answer this delivery.')
      setData(d => ({ ...d, deliveries: d.deliveries.filter(x => x.id !== deliveryId) }))
      return res.data
    } finally { setBusyId(null) }
  }, [])

  /** End the link with an organisation entirely. */
  const disconnect = useCallback(async (connectionId) => {
    setBusyId(connectionId)
    try {
      const res = await apiPost('/api/org/disconnect', { connectionId }, await authHeader())
      if (!res.ok) throw new Error(res.data?.error || 'Could not end this connection.')
      await load()
      return res.data
    } finally { setBusyId(null) }
  }, [load])

  return { ...data, loading, busyId, respond, disconnect, reload: load }
}
