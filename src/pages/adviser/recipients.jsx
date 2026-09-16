// Who this is going to: one person, a pasted list, or a CSV.
//
// Parsing is deliberately forgiving, because the realistic input is a column
// copied out of a spreadsheet or an export with a header row and three columns
// you do not care about. Anything that looks like an address is taken, the rest
// is shown back rather than silently dropped, and duplicates collapse.
import React, { useRef, useState } from 'react'
import { AlertTriangle, Upload, Users, X } from 'lucide-react'

// Two of them on purpose. A /g regex carries lastIndex between calls, so
// reusing the matcher for .test() reports every other line as having no address.
const EMAIL_MATCH = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/g
const EMAIL_ONE   = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/
const clean = (s) => String(s || '').trim().toLowerCase().replace(/[.,;]+$/, '')

export function parseRecipients(text) {
  const found = String(text || '').match(EMAIL_MATCH) || []
  const emails = [...new Set(found.map(clean))]
  // Lines with no address at all are worth showing back: usually a header row,
  // occasionally a typo that would otherwise vanish.
  const unmatched = String(text || '')
    .split(/[\n\r]+/)
    .map(l => l.trim())
    .filter(l => l && !EMAIL_ONE.test(l) && !/^[\s,;]*$/.test(l))
    .slice(0, 5)
  return { emails, unmatched }
}

export function RecipientsField({ value, onChange, label = 'Who you are sending to', max = 250 }) {
  const [text, setText] = useState('')
  const [unmatched, setUnmatched] = useState([])
  const fileRef = useRef(null)

  const apply = (raw) => {
    setText(raw)
    const { emails, unmatched: bad } = parseRecipients(raw)
    setUnmatched(bad)
    onChange(emails)
  }

  const readFile = async (file) => {
    if (!file) return
    try { apply(`${text}\n${await file.text()}`) } catch { /* unreadable file */ }
    if (fileRef.current) fileRef.current.value = ''
  }

  const tooMany = value.length > max

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-1.5">
        <span className="block text-xs font-semibold text-stone-600">{label}</span>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 hover:text-navy-800 transition-colors">
          <Upload size={12} /> Upload a CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden"
          onChange={e => readFile(e.target.files?.[0])} />
      </div>

      <textarea
        rows={value.length > 1 ? 4 : 2}
        value={text}
        onChange={e => apply(e.target.value)}
        placeholder={'person@company.com\nor paste a column from a spreadsheet, or drop a CSV above'}
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 transition-colors"
      />

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className={`inline-flex items-center gap-1.5 font-medium ${tooMany ? 'text-red-600' : 'text-stone-500'}`}>
          <Users size={12} />
          {value.length === 0 ? 'Nobody yet' : value.length === 1 ? '1 person' : `${value.length} people`}
          {tooMany ? ` · more than ${max}, split it up` : ''}
        </span>
        {value.length > 0 && (
          <button type="button" onClick={() => apply('')} className="inline-flex items-center gap-1 text-stone-400 hover:text-red-600 transition-colors">
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {unmatched.length > 0 && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-amber-800 m-0">
            Ignored, no address found: {unmatched.map(u => `"${u.slice(0, 40)}"`).join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}
