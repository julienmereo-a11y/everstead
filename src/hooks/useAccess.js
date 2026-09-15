// "Who has access": every organisation connected to this member, and anything
// an organisation has sent that the member has not answered yet.
//
// Two tables, one hook, because the screen and the Overview card must never
// disagree about how many things are waiting. Nothing here can widen access:
// connections are read-only to the client (see the migration), and both writes
// go through service-role endpoints that re-check ownership.
import { useCallback, useEffect, useState } from 'react'
import { apiPost } from '../lib/platform'
import { DEMO_ACCESS_REQUESTS, DEMO_CONNECTIONS, DEMO_DELIVERIES, DEMO_SHARES } from '../lib/demoData'

const EMPTY = { connections: [], deliveries: [], shares: [], requests: [] }
const DEMO  = { connections: DEMO_CONNECTIONS, deliveries: DEMO_DELIVERIES, shares: DEMO_SHARES, requests: DEMO_ACCESS_REQUESTS }

export function useAccess(profile, isDemo) {
  const [data, setData] = useState(isDemo ? DEMO : EMPTY)
  const [loading, setLoading] = useState(!isDemo)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    if (isDemo) { setData(DEMO); setLoading(false); return }
    if (!profile?.id) { setData(EMPTY); setLoading(false); return }
    const { supabase: sb } = await import('../lib/supabase')
    const [connRes, delRes, shareRes, reqRes] = await Promise.all([
      sb.rpc('get_my_connections'),
      sb.from('inbound_deliveries')
        .select('id, org_id, title, doc_type, note, sender_name, mime_type, file_size, sent_at, expires_at, status')
        .eq('status', 'sent')
        .order('sent_at', { ascending: false }),
      sb.rpc('get_my_shares'),
      sb.rpc('get_my_org_requests'),
    ])
    setData({
      connections: Array.isArray(connRes.data) ? connRes.data : [],
      deliveries: Array.isArray(delRes.data) ? delRes.data : [],
      shares: Array.isArray(shareRes.data) ? shareRes.data : [],
      // Absent before the requests migration; an empty list is the right answer then.
      requests: Array.isArray(reqRes.data) ? reqRes.data : [],
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

  /**
   * Share ONE document with a connected organisation, for a while. `days` null
   * means until revoked. Written straight through PostgREST: the insert policy
   * pins the row to this member, an active connection and a document they own,
   * so there is nothing for an endpoint to re-check.
   */
  const grantShare = useCallback(async (orgId, documentId, days) => {
    if (isDemo) {
      // The demo is a sales tool: the control has to work, it just must not write.
      setData(d => ({ ...d, shares: [...d.shares, {
        id: `demo-share-${Date.now()}`, org_id: orgId,
        firm_name: d.connections.find(c => c.org_id === orgId)?.firm_name || '',
        resource_type: 'document', resource_id: documentId, resource_name: null,
        granted_at: new Date().toISOString(),
        expires_at: days ? new Date(Date.now() + days * 86400000).toISOString() : null,
      }] }))
      return
    }
    setBusyId(documentId)
    try {
      const { supabase: sb } = await import('../lib/supabase')
      const expires_at = days ? new Date(Date.now() + days * 86400000).toISOString() : null
      const { error } = await sb.from('member_shares').upsert({
        member_id: profile.id, org_id: orgId, resource_type: 'document', resource_id: documentId,
        expires_at, revoked_at: null, granted_at: new Date().toISOString(),
      }, { onConflict: 'member_id,org_id,resource_type,resource_id' })
      if (error) throw new Error(error.message)
      await load()
    } finally { setBusyId(null) }
  }, [profile?.id, isDemo, load])

  /** Stop a share now. Works even after the connection itself has ended. */
  const revokeShare = useCallback(async (shareId) => {
    if (isDemo) { setData(d => ({ ...d, shares: d.shares.filter(x => x.id !== shareId) })); return }
    setBusyId(shareId)
    try {
      const { supabase: sb } = await import('../lib/supabase')
      const { error } = await sb.from('member_shares')
        .update({ revoked_at: new Date().toISOString() }).eq('id', shareId)
      if (error) throw new Error(error.message)
      setData(d => ({ ...d, shares: d.shares.filter(s => s.id !== shareId) }))
    } finally { setBusyId(null) }
  }, [])
  return { ...data, loading, busyId, respond, disconnect, grantShare, revokeShare, reload: load }
}
