import React, { useState, useEffect } from 'react'
import { Shield } from 'lucide-react'

// Simple session-level gate that sits in front of all /admin* routes.
// The password is checked client-side; once correct the flag lives in
// sessionStorage so the gate doesn't re-appear within the same tab session.
// (sessionStorage is cleared automatically when the browser tab is closed.)

const SESSION_KEY = 'everstead_admin_gate'

// SHA-256 of "W2zp8k!" — avoids storing the raw password in the bundle.
// Generated with: crypto.subtle.digest('SHA-256', new TextEncoder().encode('W2zp8k!'))
const CORRECT_HASH = '49eb0f8ab4ed7d5cbda4eb17196194f73cd414c9922bf9c1b2155f803fc2ea0d'

async function sha256(str) {
  const buf    = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function AdminGate({ children }) {
  const [passed,  setPassed]  = useState(() => sessionStorage.getItem(SESSION_KEY) === '1')
  const [value,   setValue]   = useState('')
  const [error,   setError]   = useState(false)
  const [loading, setLoading] = useState(false)

  // Keep sessionStorage in sync
  useEffect(() => {
    if (passed) sessionStorage.setItem(SESSION_KEY, '1')
  }, [passed])

  if (passed) return children

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    const hash = await sha256(value)
    if (hash === CORRECT_HASH) {
      setPassed(true)
    } else {
      setError(true)
      setValue('')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-10 space-y-7">

        {/* Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${error ? 'bg-red-50 text-red-500' : 'bg-navy-50 text-navy-800'}`}>
            <Shield size={24} />
          </div>
          <div className="text-center">
            <h1 className="text-navy-900 font-semibold text-lg">Admin access</h1>
            <p className="text-stone-400 text-sm mt-1">Enter the access password to continue.</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={value}
            onChange={e => { setValue(e.target.value); setError(false) }}
            placeholder="Access password"
            autoFocus
            autoComplete="current-password"
            className={`w-full border rounded-xl px-4 py-3 text-sm text-navy-900 placeholder-stone-400 outline-none transition-colors
              ${error
                ? 'border-red-300 bg-red-50 focus:border-red-400'
                : 'border-stone-200 bg-stone-50 focus:border-navy-400 focus:bg-white'
              }`}
          />
          {error && (
            <p className="text-red-500 text-xs text-center">Incorrect password. Please try again.</p>
          )}
          <button
            type="submit"
            disabled={!value || loading}
            className="w-full bg-navy-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-40"
          >
            {loading ? 'Checking…' : 'Continue'}
          </button>
        </form>

        <p className="text-center text-xs text-stone-300">Everstead · Admin portal</p>
      </div>
    </div>
  )
}
