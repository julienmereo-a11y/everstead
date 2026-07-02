import React, { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Building2, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * AcceptAdviserInvite — /accept-adviser-invite?token=<uuid>
 *
 * A newly-seated adviser sets their password, which creates their account with
 * portal access (plan='advisor') and links them to their firm, then lands them in
 * the adviser portal. Mirrors AcceptAdminInvite.
 */
export default function AcceptAdviserInvite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  // 'verifying' | 'form' | 'creating' | 'done' | 'error'
  const [stage, setStage]   = useState('verifying')
  const [invite, setInvite] = useState(null)
  const [errMsg, setErrMsg] = useState('')

  const [name, setName]     = useState('')
  const [pw, setPw]         = useState('')
  const [showPw, setShowPw] = useState(false)
  const [formErr, setFormErr] = useState('')

  // Verify the token + load firm branding.
  useEffect(() => {
    if (!token) { setErrMsg('No invite token found in this link.'); setStage('error'); return }
    supabase.rpc('get_adviser_invite', { p_token: token }).then(({ data, error }) => {
      const inv = Array.isArray(data) ? data[0] : data
      if (error || !inv) { setErrMsg('This invite link is invalid or has expired.'); setStage('error'); return }
      if (inv.invite_status === 'revoked') { setErrMsg('This invitation has been revoked.'); setStage('error'); return }
      if (inv.invite_status === 'accepted') { setErrMsg('This invitation has already been used. Please sign in instead.'); setStage('error'); return }
      setInvite(inv)
      setStage('form')
    })
  }, [token])

  const submit = async (e) => {
    e.preventDefault()
    setFormErr(''); setStage('creating')
    try {
      const res = await fetch('/api/auth/delegate-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'adviser', email: invite.email, password: pw, name, token }),
      })
      const data = await res.json()
      if (!res.ok) { setFormErr(data.error || 'Something went wrong.'); setStage('form'); return }
      await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
      setStage('done')
      setTimeout(() => navigate('/advisor-portal'), 1800)
    } catch {
      setFormErr('Network error. Please try again.'); setStage('form')
    }
  }

  return (
    <div className="min-h-screen aurora-field aurora-dim flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-10">

        {/* Firm branding */}
        <div className="flex flex-col items-center gap-2 mb-8">
          {invite?.logo_url ? (
            <img src={invite.logo_url} alt={invite.firm_name || ''} className="h-10 max-w-[160px] object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-navy-800 flex items-center justify-center"><Building2 size={18} className="text-white" /></div>
          )}
          {invite?.firm_name && <p className="text-xs text-stone-500">{invite.firm_name} · powered by Everstead</p>}
        </div>

        {stage === 'verifying' && (
          <div className="text-center space-y-3">
            <Loader2 size={28} className="animate-spin text-navy-400 mx-auto" />
            <p className="text-sm text-stone-500">Checking your invite link…</p>
          </div>
        )}

        {stage === 'form' && invite && (
          <form onSubmit={submit} className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="font-semibold text-navy-900 text-lg">Set up your adviser account</h2>
              <p className="text-xs text-stone-500 mt-1">for <strong className="text-navy-800">{invite.email}</strong></p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Full name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Email</label>
              <input type="email" value={invite.email} readOnly
                className="w-full border border-stone-100 rounded-xl px-4 py-3 text-sm text-stone-400 bg-stone-50 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required minLength={8} value={pw} onChange={e => setPw(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 pr-10 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-300" />
                <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {formErr && <p className="text-xs text-red-600 leading-relaxed">{formErr}</p>}
            <button type="submit" className="btn-aurora inline-flex items-center justify-center gap-2 w-full text-white text-sm font-semibold py-3 rounded-full">
              Create account & open portal
            </button>
          </form>
        )}

        {stage === 'creating' && (
          <div className="text-center space-y-3">
            <Loader2 size={28} className="animate-spin text-navy-400 mx-auto" />
            <p className="text-sm text-stone-500">Setting up your account…</p>
          </div>
        )}

        {stage === 'done' && (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto"><CheckCircle2 size={28} className="text-emerald-600" /></div>
            <div>
              <h2 className="font-semibold text-navy-900 text-lg">You're all set</h2>
              <p className="text-sm text-stone-500 mt-2 leading-relaxed">Taking you to the adviser portal…</p>
            </div>
            <Link to="/advisor-portal" className="inline-flex items-center justify-center w-full bg-navy-900 text-white text-sm font-semibold py-3 rounded-full hover:bg-navy-800 transition-colors">Open the portal</Link>
          </div>
        )}

        {stage === 'error' && (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto"><AlertCircle size={28} className="text-red-500" /></div>
            <div>
              <h2 className="font-semibold text-navy-900 text-lg">Invite unavailable</h2>
              <p className="text-sm text-stone-500 mt-2 leading-relaxed">{errMsg}</p>
            </div>
            <Link to="/login" className="inline-flex items-center justify-center w-full border border-stone-200 text-navy-800 text-sm font-semibold py-3 rounded-full hover:bg-stone-50 transition-colors">Go to sign in</Link>
          </div>
        )}
      </div>
    </div>
  )
}
