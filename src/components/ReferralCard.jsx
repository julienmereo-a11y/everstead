import React, { useState, useMemo } from 'react'
import { Gift, Copy, Check, Share2 } from 'lucide-react'

/**
 * Dashboard card that surfaces the existing referral system.
 * Build a referral link using the current user's id; anyone who signs up
 * via that link gets a 21-day trial instead of 14 (already wired in
 * GetStarted.jsx via the `?ref=` query param).
 */
export default function ReferralCard({ userId }) {
  const [copied, setCopied] = useState(false)

  const referralUrl = useMemo(() => {
    if (!userId) return null
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.everstead.care'
    return `${base}/get-started?ref=${encodeURIComponent(userId)}`
  }, [userId])

  if (!referralUrl) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback: select the input contents
      const el = document.getElementById('referral-link-input')
      el?.select()
    }
  }

  const share = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) {
      copy()
      return
    }
    try {
      await navigator.share({
        title: 'Everstead',
        text: 'I use Everstead to keep my family\'s important information organised. Sign up with my link and get an extra week of free trial.',
        url: referralUrl,
      })
    } catch {
      // user cancelled — no-op
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 lg:p-7">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-sage-50 text-sage-700 flex items-center justify-center shrink-0">
          <Gift size={18} />
        </div>
        <div>
          <h3 className="font-display text-lg text-navy-950 leading-snug">Invite a family member or friend</h3>
          <p className="mt-1 text-sm text-stone-600 leading-relaxed">
            They get <strong>21 days free</strong> instead of the standard 14, share your link with anyone who'd benefit from getting their estate organised.
          </p>
        </div>
      </div>

      <div className="flex items-stretch gap-2">
        <input
          id="referral-link-input"
          readOnly
          value={referralUrl}
          aria-label="Your personal referral link"
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 px-3 py-2.5 text-sm rounded-xl border border-stone-200 bg-stone-50 text-stone-700 focus:outline-none focus:ring-2 focus:ring-sage-500/40 focus:border-sage-500 truncate"
        />
        <button
          onClick={copy}
          aria-label="Copy referral link"
          className="px-3 py-2.5 text-sm font-medium rounded-xl bg-navy-900 text-white hover:bg-navy-800 transition-colors inline-flex items-center gap-1.5 shrink-0"
        >
          {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
        </button>
        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            onClick={share}
            aria-label="Share referral link"
            className="px-3 py-2.5 text-sm font-medium rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors inline-flex items-center gap-1.5 shrink-0"
          >
            <Share2 size={14} /> <span className="hidden sm:inline">Share</span>
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-stone-400 leading-relaxed">
        Anyone signing up through your link gets an extended trial. No card needed until day 21.
      </p>
    </div>
  )
}
