import React from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n'
import { useAuth } from '../../../../contexts/AuthContext'
import { ChevronIcon, CheckIcon } from '../icons'
import { planLabel, marketPricing, FREE_LIMITS } from '../../../../config/pricing'

// Home — dark hero (greeting + real readiness ring), Up next (real gaps),
// stat tiles (real counts), upgrade nudge (free plan only), recent activity
// (real activity_log). Readiness is computed from live data via
// ../readiness.js, matching the web exactly.

export default function HomeScreen({ app }) {
  const { t, i18n } = useTranslation('mobile')
  // French members see euro prices; the Apple purchase itself is priced by the
  // App Store in the buyer's storefront currency, so this is display only.
  const market = marketPricing(i18n.language)
  const auth = useAuth()
  const profile = app.profile || auth.profile
  const {
    greeting, dateLabel, firstName, initials, scorePct, ringOff, ringCircumference, scoreTxt,
    upNext, upEmpty, accCount, docCount, memCount, activity,
    go,
  } = app

  // Upgrade nudge — free plan only (grandfathered Essential subscribers already
  // pay; they get upgrade prompts contextually, not on Home).
  const showUpgrade = (profile?.plan || 'free') === 'free' && !app.demo
  // Lead with the wall they're closest to hitting (free caps: FREE_LIMITS).
  const capped = docCount >= FREE_LIMITS.documents ? 'documents'
    : accCount >= FREE_LIMITS.accounts ? 'accounts' : null

  return (
    <div className="scr">
      {/* ── Dark hero ── */}
      <div className="hero grain">
        <div className="hero-glow" />
        {/* Just the "E" sprout mark — crop the wordmark to its left square so we get
            a clean transparent white E (no navy tile) on the hero. */}
        <div className="posrel" style={{ width: 40, height: 40, overflow: 'hidden', marginBottom: 16 }}>
          <img src="/logo-v2-white.png" alt="Everstead" style={{ height: 40, width: 'auto', maxWidth: 'none', display: 'block' }} />
        </div>
        <div className="fx jb ac posrel">
          <div>
            <div className="eyebrow eyebrow-sage">{dateLabel}</div>
            <h1 className="serif m0" style={{ fontSize: 27, fontWeight: 600, lineHeight: 1.15, color: '#fafaf9' }}>
              {firstName ? `${greeting}, ${firstName}.` : `${greeting}.`}
            </h1>
          </div>
          <button className="hav" onClick={() => go('more')} aria-label="More" style={{ cursor: 'pointer' }}>{initials}</button>
        </div>

        <div className="card-dark fx ac gap16 posrel" style={{ marginTop: 20, padding: '14px 16px' }}>
          <div className="posrel" style={{ width: 86, height: 86, flex: 'none' }}>
            <svg width="86" height="86" viewBox="0 0 86 86">
              <circle cx="43" cy="43" r="36" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
              <circle
                className="ringp" cx="43" cy="43" r="36" fill="none" stroke="#6e9b6a" strokeWidth="7"
                strokeLinecap="round" strokeDasharray={ringCircumference} strokeDashoffset={ringOff}
                transform="rotate(-90 43 43)"
              />
            </svg>
            <div className="posabs fx ac jc serif" style={{ inset: 0, fontSize: 21, fontWeight: 600 }}>{scorePct}</div>
          </div>
          <div className="f1">
            <div className="fs14 fw6">{t('home.estateReadiness')}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>{scoreTxt}</div>
            <button className="btn btn-light btn-sm" style={{ marginTop: 10 }} onClick={() => go('plan')}>
              {t('home.continuePlanning')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Up next (real readiness gaps) ── */}
      <div className="pad" style={{ paddingTop: 20 }}>
        <div className="eyebrow">{t('home.upNext')}</div>
        <div className="card-light ohide">
          {upEmpty ? (
            <div className="task" style={{ cursor: 'default' }}>
              <span className="ck on"><CheckIcon on /></span>
              <span className="task-lbl">{t('home.allCaughtUp')}</span>
            </div>
          ) : (
            upNext.map((t, i) => (
              <div key={t.key} className={`row ${i === 0 ? '' : 'bt'}`} onClick={() => go(t.screen)}>
                <div className="f1">
                  <div className="rname">{t.label}</div>
                  <div className="rdet">{t.detail}</div>
                </div>
                <ChevronIcon />
              </div>
            ))
          )}
          <div className="bt fx jb ac" style={{ padding: '11px 16px', cursor: 'pointer' }} onClick={() => go('plan')}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-navy-600)' }}>{t('home.viewFullPlan')}</span>
            <ChevronIcon />
          </div>
        </div>

        {/* ── Stat tiles ── */}
        <div className="fx gap10" style={{ marginTop: 18 }}>
          <div className="card-light tile" onClick={() => go('accounts')}>
            <div className="num">{accCount}</div><div className="lbl">{t('home.tileAccounts')}</div>
          </div>
          <div className="card-light tile" onClick={() => go('vault')}>
            <div className="num">{docCount}</div><div className="lbl">{t('home.tileDocuments')}</div>
          </div>
          <div className="card-light tile" onClick={() => go('family')}>
            <div className="num">{memCount}</div><div className="lbl">{t('home.tileFamily')}</div>
          </div>
        </div>

        {/* ── Upgrade nudge (free plan only) ── */}
        {showUpgrade && (
          <div
            className="grain posrel ohide"
            style={{
              marginTop: 18, padding: '18px 18px 16px', borderRadius: 16, cursor: 'pointer',
              background: 'linear-gradient(150deg,#0d1628 0%,#1d3052 100%)', color: '#fafaf9',
            }}
            onClick={() => go('upgrade')}
          >
            <div className="hero-glow" />
            <div className="posrel">
              <div className="eyebrow eyebrow-sage">{planLabel('family')}</div>
              <div className="serif" style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.25, margin: '2px 0 10px' }}>
                {capped === 'documents'
                  ? t('home.upsellDocs')
                  : capped === 'accounts'
                    ? t('home.upsellAccounts')
                    : t('home.upsellDefault')}
              </div>
              {[t('home.upsellLine1'), t('home.upsellLine2'), t('home.upsellLine3')].map(line => (
                <div key={line} className="fx ac" style={{ gap: 8, marginTop: 6 }}>
                  <span style={{ color: '#6e9b6a', flex: 'none', display: 'inline-flex' }}><CheckIcon on /></span>
                  <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.4 }}>{line}</span>
                </div>
              ))}
              <button className="btn btn-light w100" style={{ marginTop: 14 }} onClick={(e) => { e.stopPropagation(); go('upgrade') }}>
                {t('home.startTrial')}
              </button>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 8 }}>
                {t('home.priceLine', { monthly: market.family.monthly.display, annualPerMonth: market.family.annual.perMonthDisplay })}
              </div>
            </div>
          </div>
        )}

        {/* ── Recent activity ── */}
        <div className="eyebrow" style={{ marginTop: 22 }}>{t('home.recentActivity')}</div>
        <div className="card-light ohide">
          {activity.length === 0 ? (
            <div className="arow"><span className="f1" style={{ color: 'var(--color-stone-400)' }}>{t('home.noActivity')}</span></div>
          ) : (
            activity.map((v, i) => (
              <div key={v.id} className={`arow ${i === 0 ? '' : 'bt'}`}>
                <span className="f1">{v.text}</span>
                <span className="awhen">{v.when}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
