import React, { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, Navigate } from 'react-router-dom'
import i18n from '../i18n'
import { Printer, RotateCcw, CheckCircle2, Circle } from 'lucide-react'
import EmailCaptureCard from '../components/EmailCaptureCard'

// ─── Checklist data ───────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'first-72-hours',
    title: 'First 72 hours',
    subtitle: 'Immediate priorities, most of these cannot wait',
    items: [
      { id: 'h01', text: 'Obtain the medical certificate of cause of death from the doctor or hospital' },
      { id: 'h02', text: 'Register the death at the local Register Office within 5 days (England & Wales)' },
      { id: 'h03', text: 'Order at least 10-12 certified copies of the death certificate' },
      { id: 'h04', text: 'Locate the original will and identify all named executors' },
      { id: 'h05', text: 'Notify immediate family and close friends' },
      { id: 'h06', text: 'Secure the deceased\'s home and property' },
      { id: 'h07', text: 'Arrange care for any pets or dependants' },
      { id: 'h08', text: 'Cancel or pause any time-sensitive services' },
    ],
  },
  {
    id: 'first-week',
    title: 'First week',
    subtitle: 'Notify key institutions and begin financial administration',
    items: [
      { id: 'w01', text: 'Contact a solicitor or probate specialist for initial advice' },
      { id: 'w02', text: 'Notify each bank and building society (accounts will be frozen)' },
      { id: 'w03', text: 'Notify pension providers, death benefits may be claimable' },
      { id: 'w04', text: 'Notify life insurance providers and initiate claims' },
      { id: 'w05', text: 'Use the government\'s Tell Us Once service (gov.uk/tell-us-once)' },
      { id: 'w06', text: 'Notify HMRC via Tell Us Once or separately' },
      { id: 'w07', text: 'Notify the DWP to stop benefit payments' },
      { id: 'w08', text: 'Begin arranging the funeral (can proceed before probate)' },
      { id: 'w09', text: 'Cancel the deceased\'s driving licence and passport' },
    ],
  },
  {
    id: 'first-month',
    title: 'First month',
    subtitle: 'Apply for probate and compile the full estate picture',
    items: [
      { id: 'm01', text: 'Apply for Grant of Probate (or Letters of Administration if no will)' },
      { id: 'm02', text: 'Open an executor\'s bank account for estate funds' },
      { id: 'm03', text: 'Begin compiling a full asset inventory' },
      { id: 'm04', text: 'Begin compiling a full liabilities inventory' },
      { id: 'm05', text: 'Redirect post to executor\'s address if needed' },
      { id: 'm06', text: 'Notify utilities and council tax of change of occupant' },
      { id: 'm07', text: 'Notify the Electoral Register of the death' },
      { id: 'm08', text: 'Identify and cancel all active subscriptions and direct debits' },
      { id: 'm09', text: 'Handle digital accounts (email, social media, cloud storage)' },
      { id: 'm10', text: 'Maintain a clear written log of all decisions and actions taken' },
    ],
  },
  {
    id: 'months-ahead',
    title: 'The months ahead',
    subtitle: 'Administer and close the estate once probate is granted',
    items: [
      { id: 'a01', text: 'Collect all assets into the estate once Probate granted' },
      { id: 'a02', text: 'Pay all debts, bills, and outstanding liabilities' },
      { id: 'a03', text: 'File final tax returns and settle any HMRC liability' },
      { id: 'a04', text: 'Consider inheritance tax obligations (seek specialist advice above £325,000)' },
      { id: 'a05', text: 'Prepare estate accounts for beneficiary approval' },
      { id: 'a06', text: 'Distribute the estate to beneficiaries in line with the will' },
      { id: 'a07', text: 'Obtain signed receipts from all beneficiaries' },
      { id: 'a08', text: 'Keep all records for at least 12 years' },
    ],
  },
]

const DONT_SECTION = {
  id: 'what-not-to-do',
  title: 'What NOT to do before probate',
  subtitle: 'Acting prematurely can expose executors to personal liability',
  items: [
    { id: 'n01', text: 'Do not distribute assets to beneficiaries' },
    { id: 'n02', text: 'Do not sell or transfer property' },
    { id: 'n03', text: 'Do not close investment accounts' },
    { id: 'n04', text: 'Do not make gifts from estate funds' },
    { id: 'n05', text: 'Do not destroy any documents, letters, or papers' },
  ],
}

const STORAGE_KEY = 'everstead_executor_checklist_v1'

// All checkable item IDs across the four positive sections
const ALL_IDS = SECTIONS.flatMap(s => s.items.map(i => i.id))

// Schema.org ItemList data for all items (positive sections + dont items)
const SCHEMA_ITEMS = [
  ...SECTIONS.flatMap(s => s.items),
  ...DONT_SECTION.items,
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ checked, total }) {
  const pct = total === 0 ? 0 : Math.round((checked / total) * 100)
  return (
    <div className="print:hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-stone-600">Overall progress</span>
        <span className="text-sm font-semibold text-navy-900">{checked} / {total} complete ({pct}%)</span>
      </div>
      <div className="h-2.5 w-full bg-stone-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-navy-700 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}

function CheckItem({ item, checked, onToggle, danger = false }) {
  return (
    <li>
      <label
        className={`flex items-start gap-3 cursor-pointer group py-2.5 px-3 rounded-lg transition-colors
          ${checked ? 'bg-stone-50' : 'hover:bg-stone-50/70'}
          ${danger ? 'cursor-default' : ''}
        `}
      >
        {!danger && (
          <button
            type="button"
            onClick={() => onToggle(item.id)}
            className="mt-0.5 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 rounded-full"
            aria-label={checked ? `Uncheck: ${item.text}` : `Check: ${item.text}`}
          >
            {checked ? (
              <CheckCircle2 className="w-5 h-5 text-navy-700 transition-colors" />
            ) : (
              <Circle className="w-5 h-5 text-stone-300 group-hover:text-stone-400 transition-colors" />
            )}
          </button>
        )}
        {danger && (
          <span className="mt-0.5 flex-shrink-0">
            <span className="inline-block w-5 h-5 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center">
              <span className="block w-1 h-1 rounded-full bg-amber-600" />
            </span>
          </span>
        )}
        <span
          className={`text-[15px] leading-relaxed select-none transition-colors
            ${checked && !danger ? 'line-through text-stone-400' : danger ? 'text-stone-700' : 'text-stone-800'}
          `}
        >
          {item.text}
        </span>
      </label>
    </li>
  )
}

function Section({ section, checkedMap, onToggle }) {
  const checked = section.items.filter(i => checkedMap[i.id]).length
  const total = section.items.length
  return (
    <section className="mb-8 print:mb-6 print:break-inside-avoid">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h2 className="font-display text-xl text-navy-950 font-semibold">{section.title}</h2>
        <span className="print:hidden flex-shrink-0 text-xs font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full mt-0.5">
          {checked} / {total} complete
        </span>
      </div>
      <p className="text-sm text-stone-500 mb-3">{section.subtitle}</p>
      <ul className="divide-y divide-stone-100 border border-stone-100 rounded-xl bg-white shadow-sm overflow-hidden print:shadow-none print:border-stone-200">
        {section.items.map(item => (
          <CheckItem
            key={item.id}
            item={item}
            checked={!!checkedMap[item.id]}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </section>
  )
}

function DontSection({ section }) {
  return (
    <section className="mb-8 print:mb-6 print:break-inside-avoid">
      <div className="mb-1">
        <h2 className="font-display text-xl text-amber-800 font-semibold">{section.title}</h2>
      </div>
      <p className="text-sm text-stone-500 mb-3">{section.subtitle}</p>
      <ul className="divide-y divide-amber-100 border border-amber-200 rounded-xl bg-amber-50 overflow-hidden shadow-sm print:shadow-none">
        {section.items.map(item => (
          <CheckItem
            key={item.id}
            item={item}
            checked={false}
            onToggle={() => {}}
            danger
          />
        ))}
      </ul>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ExecutorChecklistEn() {
  const [checkedMap, setCheckedMap] = useState({})
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Load persisted state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setCheckedMap(JSON.parse(stored))
    } catch {
      // ignore
    }
    setLoaded(true)
  }, [])

  // Persist on change. Gated behind `loaded` so the initial empty {} can never
  // clobber saved progress before the load effect has run (same fix as
  // ApresUnDeces; StrictMode's double mount made this a data-loss bug in dev).
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedMap))
    } catch {
      // ignore
    }
  }, [checkedMap, loaded])

  const handleToggle = useCallback((id) => {
    setCheckedMap(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const handleReset = () => {
    setCheckedMap({})
    setShowResetConfirm(false)
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }

  const totalChecked = ALL_IDS.filter(id => checkedMap[id]).length
  const totalItems = ALL_IDS.length

  // JSON-LD schema
  const schemaItemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Executor Checklist: What to Do After Someone Dies',
    description: 'A complete, step-by-step executor checklist for England & Wales, from the first 72 hours through to closing the estate.',
    url: 'https://www.everstead.care/executor-checklist',
    numberOfItems: SCHEMA_ITEMS.length,
    itemListElement: SCHEMA_ITEMS.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.text,
    })),
  }

  return (
    <>
      <Helmet>
        <title>Executor Checklist: What to Do After Someone Dies | Everstead</title>
        <meta
          name="description"
          content="A free, complete executor checklist for England & Wales. Step-by-step tasks for the first 72 hours, first week, first month, and beyond."
        />
        <link rel="canonical" href="https://www.everstead.care/executor-checklist" />
        <meta property="og:title" content="Executor Checklist: What to Do After Someone Dies | Everstead" />
        <meta
          property="og:description"
          content="A free, complete executor checklist for England & Wales. Step-by-step tasks for the first 72 hours, first week, first month, and beyond."
        />
        <meta property="og:url" content="https://www.everstead.care/executor-checklist" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(schemaItemList)}</script>
      </Helmet>

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          body { font-size: 12px; }
          .print-header { display: block !important; }
        }
      `}</style>

      {/* Print-only header */}
      <div className="hidden print:block print-header mb-6 pb-4 border-b border-stone-200">
        <p className="text-sm font-semibold text-navy-800">Everstead, everstead.care</p>
        <h1 className="text-2xl font-display font-bold text-navy-950 mt-1">Executor Checklist</h1>
        <p className="text-xs text-stone-500 mt-1">England &amp; Wales · Printed {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="min-h-screen bg-stone-50 print:bg-white">
        {/* ── Hero ── */}
        <div className="aurora-field print:hidden">
          <div className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
            <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-4">Free resource · England &amp; Wales</p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-tight mb-5">
              Executor Checklist
            </h1>
            <p className="text-stone-300 text-lg leading-relaxed max-w-xl">
              A complete, step-by-step guide to everything an executor needs to do after someone dies, from the first 72 hours through to distributing the estate.
            </p>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="max-w-3xl mx-auto px-6 py-10 print:px-0 print:py-0">

          {/* ── Toolbar ── */}
          <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <ProgressBar checked={totalChecked} total={totalItems} />
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Reset */}
              {!showResetConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 px-3 py-2 rounded-full border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm">
                  <span className="text-stone-600">Clear all?</span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded transition-colors"
                  >
                    Yes, clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="text-stone-500 hover:text-stone-700 px-2 py-1 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </span>
              )}
              {/* Print */}
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-navy-800 hover:bg-navy-700 px-4 py-2 rounded-full transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print / Export
              </button>
            </div>
          </div>

          {/* Progress bar standalone on mobile — already inside toolbar above on sm+ */}
          <div className="print:hidden sm:hidden mb-6">
            <ProgressBar checked={totalChecked} total={totalItems} />
          </div>

          {/* ── Intro ── */}
          <div className="print:hidden bg-white border border-stone-100 rounded-xl p-6 shadow-sm mb-10">
            <h2 className="font-display text-lg font-semibold text-navy-950 mb-3">What does an executor actually do?</h2>
            <p className="text-stone-700 text-[15px] leading-relaxed mb-3">
              When someone dies, their executor is legally responsible for administering their estate: collecting assets, paying debts, handling tax, and distributing what remains to beneficiaries. It is a serious responsibility, and without a clear roadmap, it can feel overwhelming on top of grief.
            </p>
            <p className="text-stone-700 text-[15px] leading-relaxed">
              This checklist breaks the process into four phases: the first 72 hours, the first week, the first month, and the months ahead. Tick each item as you go, your progress is saved automatically in your browser so you can return at any time.
            </p>
          </div>

          {/* ── Print intro ── */}
          <div className="hidden print:block mb-6">
            <p className="text-[13px] text-stone-600 leading-relaxed">
              This checklist covers every key step for administering an estate in England &amp; Wales. Work through each phase in order, ticking items as they are completed. Seek professional legal or tax advice for anything that requires specialist knowledge.
            </p>
          </div>

          {/* ── Checklist sections ── */}
          {SECTIONS.map(section => (
            <Section
              key={section.id}
              section={section}
              checkedMap={checkedMap}
              onToggle={handleToggle}
            />
          ))}

          {/* ── Don't section ── */}
          <DontSection section={DONT_SECTION} />

          {/* ── Disclaimer ── */}
          <div className="bg-stone-100 rounded-xl p-5 mb-10 print:bg-transparent print:border print:border-stone-200 print:mb-4">
            <p className="text-xs text-stone-500 leading-relaxed">
              <strong className="text-stone-600">Important:</strong> This checklist is for general guidance only and applies to England &amp; Wales. It is not legal or financial advice. Estate administration can be complex, particularly where inheritance tax, trusts, or disputes are involved. Always consult a qualified solicitor or probate specialist for advice specific to your circumstances.
            </p>
          </div>

          {/* ── Email capture ── */}
          <div className="print:hidden mb-10">
            <EmailCaptureCard
              source="executor-checklist"
              title="Want the full checklist by email?"
              subtitle="We'll send it to your inbox so you have it when you need it, printable, foldable, shareable."
              buttonLabel="Email me the checklist"
            />
          </div>

          {/* ── Soft CTA ── */}
          <div className="print:hidden border border-navy-100 bg-navy-50 rounded-2xl p-8 mb-10">
            <p className="text-xs font-semibold tracking-widest text-navy-500 uppercase mb-3">From Everstead</p>
            <h3 className="font-display text-xl font-semibold text-navy-950 mb-3">
              Make it easier for the executor you leave behind
            </h3>
            <p className="text-stone-600 text-[15px] leading-relaxed mb-6">
              The hardest part of estate administration is usually finding everything, accounts, documents, wishes, contacts. Everstead lets you organise it all in one place and share it with the people who will need it, so your executor can focus on the people, not the paperwork.
            </p>
            <Link
              to="/get-started"
              className="btn-aurora inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
            >
              Start organising your estate
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* ── Share prompt ── */}
          <div className="print:hidden text-center mb-12">
            <p className="text-sm text-stone-500">
              Know someone who might need this?{' '}
              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Executor Checklist | Everstead',
                      text: 'A free, complete checklist for executors in England & Wales.',
                      url: 'https://www.everstead.care/executor-checklist',
                    }).catch(() => {})
                  } else {
                    navigator.clipboard.writeText('https://www.everstead.care/executor-checklist').catch(() => {})
                  }
                }}
                className="text-navy-700 hover:text-navy-900 font-medium underline underline-offset-2 transition-colors"
              >
                Share this checklist
              </button>
            </p>
          </div>

        </div>
      </div>
    </>
  )
}

// The executor role and this timeline are England & Wales law. The French tree
// has its own native checklist (mairie, notaire, CPAM, six months for the
// succession declaration), so a French visitor lands there instead of on an
// English page dressed in French chrome. The basename turns this into
// /fr/apres-un-deces.
export default function ExecutorChecklist() {
  if (i18n.language === 'fr') return <Navigate to="/apres-un-deces" replace />
  return <ExecutorChecklistEn />
}
