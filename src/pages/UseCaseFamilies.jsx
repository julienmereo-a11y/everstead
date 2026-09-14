// /use-cases/families
//
// The families use case, built as a visual page rather than the text template
// the other personas share (UseCases.jsx). It borrows the homepage's design
// language: the felt family in the hero, a "first week" timeline, three
// product mocks on a navy band, icon tiles, and the felt child for the
// getting-started section. Copy lives under "familiesPage" in the useCases
// namespace; the six benefit tiles reuse personas.families.benefits so the
// index card and this page never drift apart.
import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HreflangLinks from '../components/HreflangLinks'
import { useReveal } from '../components/useReveal'
import { trackEvent } from '../lib/analytics'
import { OtherUseCases } from './useCasesShared'
import SendToParentsCard from '../components/SendToParentsCard'
import {
  ArrowRight, BookOpen, Check, CheckCircle2, ClipboardList, CreditCard,
  FileText, FolderOpen, Heart, Home, KeyRound, LifeBuoy, ShieldCheck, XCircle,
} from 'lucide-react'

const SECTION_X = 'px-6 sm:px-8 lg:px-12'
const BENEFIT_ICONS = [FolderOpen, ClipboardList, KeyRound, CreditCard, Heart, LifeBuoy]
const DOC_ICONS = [FileText, ShieldCheck, Home, BookOpen]

const MOCK_FRAME = 'bg-white text-navy-950 rounded-3xl border border-white/[0.12] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden'

// A white card that reads as a list in the vault: the same shape the homepage
// demo uses, so the product looks like one product everywhere.
function DocsMock({ p }) {
  const items = p('features.vault.mock.items', { returnObjects: true })
  return (
    <div className={MOCK_FRAME} aria-hidden="true">
      <div className="px-6 lg:px-7 py-4 border-b border-stone-100 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">{p('features.vault.mock.heading')}</span>
        <span className="text-xs text-stone-400">{p('features.vault.mock.count')}</span>
      </div>
      <ul className="m-0 p-0 list-none divide-y divide-stone-100">
        {items.map((it, i) => {
          const Icon = DOC_ICONS[i] ?? FileText
          return (
            <li key={it.name} className="flex items-center gap-4 px-6 lg:px-7 py-4">
              <span className="w-9 h-9 rounded-full bg-stone-100 text-navy-700 flex items-center justify-center shrink-0">
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-navy-950 truncate">{it.name}</span>
                <span className="block text-[13px] text-stone-500 truncate">{it.meta}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-600">{it.chip}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function StepsMock({ p }) {
  const items = p('features.firstSteps.mock.items', { returnObjects: true })
  return (
    <div className={MOCK_FRAME} aria-hidden="true">
      <div className="px-6 lg:px-7 py-4 border-b border-stone-100 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">{p('features.firstSteps.mock.heading')}</span>
        <span className="text-xs text-stone-400">{p('features.firstSteps.mock.sub')}</span>
      </div>
      <ol className="m-0 p-0 list-none divide-y divide-stone-100">
        {items.map((text, i) => {
          const done = i === 0
          return (
            <li key={text} className="flex items-start gap-4 px-6 lg:px-7 py-4">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold ${done ? 'bg-sage-500 text-white' : 'bg-navy-50 text-navy-700'}`}>
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span className={`text-[15px] leading-relaxed ${done ? 'text-stone-400' : 'text-navy-950'}`}>{text}</span>
            </li>
          )
        })}
      </ol>
      <p className="m-0 px-6 lg:px-7 py-3.5 bg-stone-50 border-t border-stone-100 text-[13px] text-stone-500">{p('features.firstSteps.mock.footer')}</p>
    </div>
  )
}

function FeatureRow({ p, k, imageFirst = false, children }) {
  return (
    // min-w-0 on both cells: the mocks truncate with white-space: nowrap, and
    // without it the single-column grid track sizes to that text's full width
    // and the whole row runs off a phone screen.
    <div className="reveal grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      <div className={`min-w-0 ${imageFirst ? 'lg:order-2' : ''}`}>
        <span className="section-label section-label-dark">{p(`features.${k}.eyebrow`)}</span>
        <h3 className="font-display font-light text-stone-50 text-balance m-0 leading-[1.1] text-[clamp(1.875rem,3vw,2.75rem)]">
          {p(`features.${k}.title`)}
        </h3>
        <p className="mt-5 m-0 text-base leading-[1.6] text-stone-300 max-w-[440px]">{p(`features.${k}.body`)}</p>
      </div>
      <div className={`min-w-0 ${imageFirst ? 'lg:order-1' : ''}`}>{children}</div>
    </div>
  )
}

export default function UseCaseFamilies() {
  const { t, i18n } = useTranslation('useCases')
  const isFr = i18n.language === 'fr'
  const baseUrl = `https://www.everstead.care${isFr ? '/fr' : ''}`
  const p = (key, opts) => t(`familiesPage.${key}`, opts)
  const title = t('personas.families.title')
  const pageTitle = t('meta.personaTitle', { title })
  const cta = (name) => trackEvent('cta_click', { location: 'usecase_families', cta: name })
  useReveal()

  const moments = p('week.moments', { returnObjects: true })
  const benefits = t('personas.families.benefits', { returnObjects: true })
  const startSteps = p('start.steps', { returnObjects: true })

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={p('meta.description')} />
        <link rel="canonical" href={`${baseUrl}/use-cases/families`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={p('meta.description')} />
        <meta property="og:url" content={`${baseUrl}/use-cases/families`} />
      </Helmet>
      <HreflangLinks path="/use-cases/families" />

      <div className="bg-stone-50 pt-24">

        {/* ── HERO ── */}
        <section className={`py-14 lg:py-24 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="animate-fade-up">
              <span className="section-label section-label-light">{title}</span>
              <h1 className="font-display font-light text-navy-950 text-balance m-0 tracking-[-0.01em] leading-[1.06] text-[clamp(2.375rem,4.6vw,4.25rem)]">
                {p('hero.title')}
              </h1>
              <p className="mt-6 m-0 text-[17px] sm:text-[19px] leading-[1.55] text-stone-600 max-w-[500px]">{p('hero.subtitle')}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/get-started?plan=free"
                  onClick={() => cta('start_free')}
                  className="inline-flex items-center gap-2.5 rounded-full bg-navy-600 hover:bg-navy-700 text-white text-base font-semibold px-[30px] py-4 transition-colors"
                >
                  {p('hero.ctaPrimary')} <ArrowRight size={18} />
                </Link>
                <Link
                  to="/how-it-works"
                  onClick={() => cta('how_it_works')}
                  className="inline-flex items-center gap-2 rounded-full px-[26px] py-4 text-[15px] font-medium text-navy-900 bg-white border border-stone-300 hover:border-navy-400 transition-colors"
                >
                  {p('hero.ctaSecondary')}
                </Link>
              </div>
              <p className="mt-6 m-0 flex items-center gap-[7px] text-[13px] text-stone-500">
                <CheckCircle2 size={14} className="shrink-0 text-sage-500" />
                {p('hero.reassurance')}
              </p>
            </div>
            <div className="animate-fade-in">
              <img
                src="/hero-felt-family.jpg"
                alt={p('hero.imageAlt')}
                width="1664"
                height="936"
                fetchpriority="high"
                className="w-full h-auto aspect-[16/11] lg:aspect-[5/4] object-cover rounded-3xl border border-stone-200 shadow-[0_40px_80px_-30px_rgba(13,22,40,0.35)]"
                style={{ objectPosition: '68% 50%' }}
              />
            </div>
          </div>
        </section>

        {/* ── THE FIRST WEEK: without a plan / with Everstead ── */}
        <section className={`py-20 lg:py-28 bg-white border-y border-stone-100 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto">
            <div className="reveal grid lg:grid-cols-2 gap-6 lg:gap-12 items-end mb-10 lg:mb-14">
              <div>
                <span className="section-label section-label-light">{p('week.eyebrow')}</span>
                <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">
                  {p('week.title')}
                </h2>
              </div>
              <p className="m-0 text-[17px] leading-[1.6] text-stone-600 max-w-[460px]">{p('week.intro')}</p>
            </div>

            <div className="relative">
              <div aria-hidden="true" className="hidden lg:block absolute left-0 right-0 top-[15px] h-px bg-stone-200" />
              <ol className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-5 list-none m-0 p-0">
                {moments.map((m, i) => (
                  <li key={m.when} className={`reveal reveal-delay-${i + 1} flex flex-col`}>
                    <span className="self-start inline-flex items-center rounded-full bg-navy-950 text-white text-[11px] font-bold tracking-[0.12em] uppercase px-3 py-1.5">
                      {m.when}
                    </span>
                    <div className="mt-5 card-light flex-1 p-6 flex flex-col gap-5">
                      <h3 className="font-display font-medium text-[22px] text-navy-950 m-0 leading-tight">{m.title}</h3>
                      <div className="flex flex-col gap-4 text-sm leading-relaxed">
                        <div>
                          <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400 mb-1.5">{p('week.withoutLabel')}</span>
                          <p className="m-0 flex gap-2.5 text-stone-600">
                            <XCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                            <span>{m.without}</span>
                          </p>
                        </div>
                        <div className="border-t border-stone-100 pt-4">
                          <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-sage-600 mb-1.5">{p('week.withLabel')}</span>
                          <p className="m-0 flex gap-2.5 text-navy-950 font-medium">
                            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-sage-500" />
                            <span>{m.withPlan}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── WHAT YOUR FAMILY FINDS: three rows with product mocks ── */}
        <section className={`relative py-24 lg:py-[120px] text-stone-50 overflow-hidden grain bg-gradient-to-br from-navy-950 to-navy-800 ${SECTION_X}`}>
          <div className="relative max-w-[1200px] mx-auto">
            <div className="reveal max-w-[680px] mb-16 lg:mb-20">
              <span className="section-label section-label-dark">{p('features.eyebrow')}</span>
              <h2 className="font-display font-light text-stone-50 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">
                {p('features.title')}
              </h2>
            </div>
            <div className="flex flex-col gap-20 lg:gap-28">
              <FeatureRow p={p} k="vault">
                <DocsMock p={p} />
              </FeatureRow>
              <FeatureRow p={p} k="firstSteps" imageFirst>
                <StepsMock p={p} />
              </FeatureRow>
              <FeatureRow p={p} k="access">
                <img
                  src={isFr ? '/screenshot-access-fr.jpg' : '/screenshot-access.jpg'}
                  alt={p('features.access.imageAlt')}
                  width="944"
                  height="780"
                  loading="lazy"
                  className="w-full h-auto rounded-3xl border border-white/[0.12] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]"
                />
              </FeatureRow>
            </div>
          </div>
        </section>

        {/* ── WHAT CHANGES: six benefit tiles ── */}
        <section className={`py-20 lg:py-28 bg-stone-50 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[1fr_1.35fr] gap-10 lg:gap-16 items-center">
            <div className="reveal">
              <span className="section-label section-label-light">{t('sections.withEverstead')}</span>
              <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">
                {t('sections.whatChanges')}
              </h2>
              <p className="mt-5 m-0 text-[17px] leading-[1.6] text-stone-600 max-w-[460px]">{p('benefits.intro')}</p>
              <Link
                to="/features"
                onClick={() => cta('features')}
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-navy-600 hover:text-navy-800 transition-colors"
              >
                {p('benefits.link')} <ArrowRight size={15} />
              </Link>
            </div>
            <div className="reveal reveal-delay-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benefits.map((label, i) => {
                const Icon = BENEFIT_ICONS[i] ?? CheckCircle2
                return (
                  <div key={label} className="rounded-[14px] border border-stone-200 bg-white px-[18px] py-4 flex items-center gap-3">
                    <div className="w-[34px] h-[34px] rounded-[10px] bg-navy-100 text-navy-700 flex items-center justify-center shrink-0">
                      <Icon size={16} />
                    </div>
                    <span className="text-sm font-medium text-stone-900">{label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── GETTING STARTED: three small steps ── */}
        <section className={`py-20 lg:py-28 bg-white border-y border-stone-100 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="reveal order-2 lg:order-1">
              <img
                src="/felt-child-dog.jpg"
                alt={p('start.imageAlt')}
                width="550"
                height="680"
                loading="lazy"
                className="w-full h-auto aspect-[5/4] lg:aspect-[4/5] object-cover rounded-3xl border border-stone-200 shadow-[0_40px_80px_-30px_rgba(13,22,40,0.3)]"
                style={{ objectPosition: '50% 35%' }}
              />
            </div>
            <div className="reveal reveal-delay-1 order-1 lg:order-2">
              <span className="section-label section-label-light">{p('start.eyebrow')}</span>
              <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">
                {p('start.title')}
              </h2>
              <ol className="mt-8 flex flex-col gap-5 list-none m-0 p-0">
                {startSteps.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="w-10 h-10 rounded-full bg-navy-950 text-white font-display text-xl flex items-center justify-center shrink-0">{i + 1}</span>
                    <div>
                      <h3 className="m-0 text-base font-semibold text-navy-950">{s.title}</h3>
                      <p className="m-0 mt-1 text-[15px] text-stone-600 leading-relaxed">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-8 m-0 text-[15px] text-stone-500 leading-relaxed border-l-2 border-sage-300 pl-4">{p('start.note')}</p>
            </div>
          </div>
        </section>

        {/* ── SEND THIS TO YOUR PARENTS ── */}
        <section className={`py-20 lg:py-28 bg-stone-50 ${SECTION_X}`}>
          <div className="max-w-[760px] mx-auto reveal">
            <SendToParentsCard
              link={`https://www.everstead.care${isFr ? '/fr' : ''}/get-started?utm_source=site&utm_medium=send_to_parents`}
              location="usecase_families"
              eyebrow={p('parents.eyebrow')}
              title={p('parents.title')}
              body={p('parents.body')}
            />
          </div>
        </section>

        {/* ── CTA ── */}
        <section className={`py-20 lg:py-28 ${SECTION_X}`}>
          <div className="max-w-3xl mx-auto text-center reveal">
            <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 mb-4 text-balance">
              {t('cta.shared.readyTitle')}
            </h2>
            <p className="text-stone-500 mb-8 text-base leading-relaxed">{t('cta.shared.readyBody')}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/get-started?plan=free"
                onClick={() => cta('start_free_bottom')}
                className="btn-primary inline-flex items-center justify-center gap-2 font-semibold text-sm px-7 py-3.5 rounded-full"
              >
                {t('cta.families.text')} <ArrowRight size={15} />
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex items-center justify-center gap-2 bg-white text-navy-800 font-semibold text-sm px-7 py-3.5 rounded-full border border-stone-200 hover:border-navy-300 hover:bg-stone-50 transition-colors"
              >
                {t('cta.shared.seeHowItWorks')}
              </Link>
            </div>
            <p className="mt-4 text-stone-400 text-xs">{t('cta.families.note')}</p>
          </div>
        </section>

        <OtherUseCases current="families" />
      </div>
    </>
  )
}
