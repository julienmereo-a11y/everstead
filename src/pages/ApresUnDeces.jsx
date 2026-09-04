import React, { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Printer, RotateCcw, CheckCircle2, Circle } from 'lucide-react'
import HreflangLinks from '../components/HreflangLinks'
import i18n from '../i18n'
import enApresUnDeces from '../i18n/locales/en/apresUnDeces.json'
import frApresUnDeces from '../i18n/locales/fr/apresUnDeces.json'

// Self-registered namespace (keeps src/i18n/index.js untouched). Safe to move
// into the central resources map later, re-adding the same bundle is a no-op.
i18n.addResourceBundle('en', 'apresUnDeces', enApresUnDeces)
i18n.addResourceBundle('fr', 'apresUnDeces', frApresUnDeces)

// Interactive checklist of the FRENCH after-death process. Serves both trees:
// /fr/apres-un-deces renders in French, /apres-un-deces renders the same French
// process described in English (useful for expats in France). Progress is
// persisted per browser under its own storage key, independent from the UK
// executor checklist.
const STORAGE_KEY = 'everstead_apres_un_deces_v1'

// Sub-components

function ProgressBar({ checked, total, t }) {
  const pct = total === 0 ? 0 : Math.round((checked / total) * 100)
  return (
    <div className="print:hidden">
      <div className="flex items-center justify-between gap-6 mb-2">
        <span className="text-sm font-medium text-stone-600">{t('toolbar.progressLabel')}</span>
        <span className="text-sm font-semibold text-navy-900">{t('toolbar.progressCount', { checked, total, pct })}</span>
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

function CheckItem({ item, checked, onToggle, t }) {
  return (
    <li>
      <label
        className={`flex items-start gap-3 cursor-pointer group py-3 px-3 rounded-lg transition-colors
          ${checked ? 'bg-stone-50' : 'hover:bg-stone-50/70'}
        `}
      >
        <button
          type="button"
          onClick={() => onToggle(item.id)}
          className="mt-0.5 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 rounded-full"
          aria-label={checked ? t('toolbar.uncheck', { item: item.title }) : t('toolbar.check', { item: item.title })}
        >
          {checked ? (
            <CheckCircle2 className="w-5 h-5 text-navy-700 transition-colors" />
          ) : (
            <Circle className="w-5 h-5 text-stone-300 group-hover:text-stone-400 transition-colors" />
          )}
        </button>
        <span className="select-none">
          <span
            className={`block text-[15px] font-medium leading-snug transition-colors
              ${checked ? 'line-through text-stone-400' : 'text-stone-800'}
            `}
          >
            {item.title}
          </span>
          <span
            className={`block text-sm leading-relaxed mt-1 transition-colors
              ${checked ? 'text-stone-300' : 'text-stone-500'}
            `}
          >
            {item.desc}
          </span>
        </span>
      </label>
    </li>
  )
}

function Section({ section, checkedMap, onToggle, t }) {
  const checked = section.items.filter(i => checkedMap[i.id]).length
  const total = section.items.length
  return (
    <section className="mb-8 print:mb-6 print:break-inside-avoid">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h2 className="font-display text-xl text-navy-950 font-semibold">{section.title}</h2>
        <span className="print:hidden flex-shrink-0 text-xs font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full mt-0.5">
          {t('toolbar.sectionCount', { checked, total })}
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
            t={t}
          />
        ))}
      </ul>
    </section>
  )
}

// Page

export default function ApresUnDeces() {
  const { t, i18n: i18nInstance } = useTranslation('apresUnDeces')
  const [checkedMap, setCheckedMap] = useState({})
  const [loaded, setLoaded] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

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

  // Persist on change, but never before the stored state has been read: the
  // gate stops the initial empty map from clobbering saved progress (StrictMode
  // runs both effects twice on mount in dev, which loses the data without it).
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

  // Sections come from the namespace so both trees serve the same French
  // process in their own language. Item ids are identical in both locale files,
  // so progress survives a language switch.
  const rawSections = t('sections', { returnObjects: true })
  const sections = Array.isArray(rawSections) ? rawSections : []
  const allIds = sections.flatMap(s => s.items.map(i => i.id))
  const totalChecked = allIds.filter(id => checkedMap[id]).length
  const totalItems = allIds.length

  const isFrench = i18nInstance.language === 'fr'
  const localePrefix = isFrench ? '/fr' : ''
  const pageUrl = `https://www.everstead.care${localePrefix}/apres-un-deces`
  const printDate = new Date().toLocaleDateString(isFrench ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // JSON-LD schema
  const schemaItems = sections.flatMap(s => s.items)
  const schemaItemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t('schema.name'),
    description: t('schema.description'),
    url: pageUrl,
    inLanguage: isFrench ? 'fr' : 'en-GB',
    numberOfItems: schemaItems.length,
    itemListElement: schemaItems.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.title,
    })),
  }

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={t('meta.title')} />
        <meta property="og:description" content={t('meta.description')} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(schemaItemList)}</script>
      </Helmet>
      <HreflangLinks path="/apres-un-deces" />

      {/* Print styles */}
      <style>{`
        @media print {
          body { font-size: 12px; }
          .print-header { display: block !important; }
        }
      `}</style>

      {/* Print-only header */}
      <div className="hidden print:block print-header mb-6 pb-4 border-b border-stone-200">
        <p className="text-sm font-semibold text-navy-800">{t('print.brand')}</p>
        <h1 className="text-2xl font-display font-bold text-navy-950 mt-1">{t('print.title')}</h1>
        <p className="text-xs text-stone-500 mt-1">{t('print.meta', { date: printDate })}</p>
      </div>

      <div className="min-h-screen bg-stone-50 print:bg-white">
        {/* Hero */}
        <div className="aurora-field print:hidden">
          <div className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
            <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase mb-4">{t('hero.eyebrow')}</p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-tight mb-5">
              {t('hero.title')}
            </h1>
            <p className="text-stone-300 text-lg leading-relaxed max-w-xl">
              {t('hero.subtitle')}
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-3xl mx-auto px-6 py-10 print:px-0 print:py-0">

          {/* Toolbar */}
          <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <ProgressBar checked={totalChecked} total={totalItems} t={t} />
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Reset */}
              {!showResetConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 px-3 py-2 rounded-full border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('toolbar.reset')}
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm">
                  <span className="text-stone-600">{t('toolbar.confirm')}</span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded transition-colors"
                  >
                    {t('toolbar.confirmYes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="text-stone-500 hover:text-stone-700 px-2 py-1 rounded transition-colors"
                  >
                    {t('toolbar.confirmCancel')}
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
                {t('toolbar.print')}
              </button>
            </div>
          </div>

          {/* Progress bar standalone on mobile */}
          <div className="print:hidden sm:hidden mb-6">
            <ProgressBar checked={totalChecked} total={totalItems} t={t} />
          </div>

          {/* Intro */}
          <div className="print:hidden bg-white border border-stone-100 rounded-xl p-6 shadow-sm mb-10">
            <h2 className="font-display text-lg font-semibold text-navy-950 mb-3">{t('intro.title')}</h2>
            <p className="text-stone-700 text-[15px] leading-relaxed mb-3">
              {t('intro.p1')}
            </p>
            <p className="text-stone-700 text-[15px] leading-relaxed">
              {t('intro.p2')}
            </p>
          </div>

          {/* Print intro */}
          <div className="hidden print:block mb-6">
            <p className="text-[13px] text-stone-600 leading-relaxed">
              {t('print.intro')}
            </p>
          </div>

          {/* Checklist sections */}
          {sections.map(section => (
            <Section
              key={section.id}
              section={section}
              checkedMap={checkedMap}
              onToggle={handleToggle}
              t={t}
            />
          ))}

          {/* Assistant IA : la checklist dit QUOI faire, l'assistant répond aux
              questions singulières que chaque situation soulève. */}
          <div className="mt-8 bg-navy-950 rounded-2xl p-6 text-center">
            <p className="text-white font-medium text-sm mb-1">{t('assistant.title')}</p>
            <p className="text-stone-400 text-xs mb-4 max-w-md mx-auto">{t('assistant.body')}</p>
            <a href={`${localePrefix}/assistant-apres-deces`} className="btn-aurora inline-flex items-center gap-2 text-white font-semibold text-xs px-5 py-2.5 rounded-full">{t('assistant.cta')}</a>
          </div>

          {/* Disclaimer */}
          <div className="bg-stone-100 rounded-xl p-5 mb-10 print:bg-transparent print:border print:border-stone-200 print:mb-4">
            <p className="text-xs text-stone-500 leading-relaxed">
              <strong className="text-stone-600">{t('disclaimer.label')}</strong> {t('disclaimer.text')}
            </p>
          </div>

          {/* Soft CTA */}
          <div className="print:hidden border border-navy-100 bg-navy-50 rounded-2xl p-8 mb-10">
            <p className="text-xs font-semibold tracking-widest text-navy-500 uppercase mb-3">{t('cta.eyebrow')}</p>
            <h3 className="font-display text-xl font-semibold text-navy-950 mb-3">
              {t('cta.title')}
            </h3>
            <p className="text-stone-600 text-[15px] leading-relaxed mb-6">
              {t('cta.body')}
            </p>
            <Link
              to="/get-started"
              className="btn-aurora inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
            >
              {t('cta.button')}
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Share prompt */}
          <div className="print:hidden text-center mb-12">
            <p className="text-sm text-stone-500">
              {t('share.prompt')}{' '}
              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: t('share.title'),
                      text: t('share.text'),
                      url: pageUrl,
                    }).catch(() => {})
                  } else {
                    navigator.clipboard.writeText(pageUrl).catch(() => {})
                  }
                }}
                className="text-navy-700 hover:text-navy-900 font-medium underline underline-offset-2 transition-colors"
              >
                {t('share.button')}
              </button>
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
