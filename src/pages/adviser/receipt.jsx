// The button that turns a row into something a professional can file.
//
// Lives next to the exchange it describes rather than behind a menu, because
// the moment you want the receipt is the moment you are looking at the row.
import React, { useState } from 'react'
import { Loader2, Receipt } from 'lucide-react'

export function ReceiptButton({ kind, row, orgName }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const make = async () => {
    setBusy(true); setFailed(false)
    try {
      const { buildAttestation, downloadPdf } = await import('../../lib/attestation')
      const bytes = await buildAttestation(kind, row, { orgName })
      const ref = String(row.id || '').split('-')[0]
      downloadPdf(bytes, `everstead-attestation-${ref}.pdf`)
    } catch { setFailed(true) } finally { setBusy(false) }
  }

  return (
    <button
      onClick={make}
      disabled={busy}
      title="Download an attestation of this exchange"
      className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${failed ? 'text-red-600' : 'text-stone-500 hover:text-navy-800'}`}
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Receipt size={12} />}
      {failed ? 'Try again' : 'Receipt'}
    </button>
  )
}
