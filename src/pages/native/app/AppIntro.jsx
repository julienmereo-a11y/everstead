import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './i18n'
import { getPref, setPref } from '../../../lib/prefs'
import { haptic } from '../../../lib/haptics'
import { HomeIcon, AccountsIcon, DocIcon, FamilyIcon, HeartIcon, SparkIcon, MessageIcon } from './icons'

// First-run tour — 4 short steps on how to use the app and why it matters, shown
// ONCE per device after the first sign-in (also covers existing website users whose
// first app launch skips the signup onboarding entirely). Skippable; the flag lives
// in device-local prefs, so a fresh device shows it again. Styled to match the dark
// onboarding (.ob) screens.
const INTRO_SEEN_KEY = 'evst_intro_seen'

export const hasSeenIntro = async () => (await getPref(INTRO_SEEN_KEY)) === 'true'
const markIntroSeen = () => setPref(INTRO_SEEN_KEY, 'true')

// Built per render from t(): the strings live in the `mobile` namespace
// (en/fr), and a language change re-renders straight into the other language.
const steps = (t) => [
  {
    logo: true,
    title: <>{t('intro.welcomeTitlePre')}<span className="aurora">Everstead</span>{t('intro.welcomeTitlePost')}</>,
    sub: t('intro.welcomeSub'),
    points: [],
  },
  {
    title: t('intro.buildTitle'),
    sub: t('intro.buildSub'),
    points: [
      { Icon: AccountsIcon, label: t('intro.buildAccountsLabel'), text: t('intro.buildAccountsText') },
      { Icon: DocIcon,      label: t('intro.buildVaultLabel'),    text: t('intro.buildVaultText') },
    ],
  },
  {
    title: t('intro.accessTitle'),
    sub: t('intro.accessSub'),
    points: [
      { Icon: FamilyIcon, label: t('intro.accessContactsLabel'), text: t('intro.accessContactsText') },
      { Icon: HeartIcon,  label: t('intro.accessTermsLabel'),    text: t('intro.accessTermsText') },
    ],
  },
  {
    title: t('intro.moreTitle'),
    sub: t('intro.moreSub'),
    points: [
      { Icon: MessageIcon, label: t('intro.moreMessagesLabel'),  text: t('intro.moreMessagesText') },
      { Icon: SparkIcon,   label: t('intro.moreAssistantLabel'), text: t('intro.moreAssistantText') },
    ],
  },
]

export default function AppIntro({ onDone }) {
  const { t } = useTranslation('mobile')
  const [step, setStep] = useState(0)
  const STEPS = steps(t)
  const s = STEPS[step]
  const last = step === STEPS.length - 1

  const finish = () => { markIntroSeen(); onDone() }
  const next = () => { haptic.tick(); last ? finish() : setStep(n => n + 1) }

  return (
    <div className="ob grain">
      <div className="hero-glow" />
      {!last && <button className="skip" onClick={finish}>{t('common.skip')}</button>}

      <div className="f1 fx col jc posrel">
        {s.logo
          ? <img src="/logo-v2-white.png" alt="Everstead" style={{ height: 44, width: 'auto', alignSelf: 'flex-start', marginBottom: 26 }} />
          : <div className="eyebrow eyebrow-sage">{t('intro.eyebrow')}</div>}
        <h1 className="obh" style={{ fontSize: 32 }}>{s.title}</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.65)', margin: '14px 0 0' }}>{s.sub}</p>

        {s.points.length > 0 && (
          <div className="fx col gap12" style={{ marginTop: 26 }}>
            {s.points.map(({ Icon, label, text }) => (
              <div key={label} className="card-dark fx gap12" style={{ padding: 15, alignItems: 'flex-start' }}>
                <span className="ficon"><Icon s={20} /></span>
                <div>
                  <div className="ftit">{label}</div>
                  <div className="fsub">{text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="posrel">
        <div className="dots">
          {STEPS.map((_, i) => <span key={i} className={`dot ${step === i ? 'on' : ''}`} />)}
        </div>
        <button className="btn btn-light w100" onClick={next}>
          {last ? t('intro.startPlan') : step === 0 ? t('intro.showMeAround') : t('common.continue')}
        </button>
        {step > 0 && !last && (
          <button className="linkbtn" onClick={() => setStep(n => n - 1)}>{t('common.back')}</button>
        )}
      </div>
    </div>
  )
}
