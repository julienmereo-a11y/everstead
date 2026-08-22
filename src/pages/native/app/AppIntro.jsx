import React, { useState } from 'react'
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

const STEPS = [
  {
    logo: true,
    title: <>Welcome to <span className="aurora">Everstead</span>.</>,
    sub: "One calm, private place to get life's important things organised, for you today, and for the people you love tomorrow.",
    points: [],
  },
  {
    title: 'Build your plan, step by step.',
    sub: "Home shows your estate readiness. Follow “Up next” and watch your score grow as your plan takes shape.",
    points: [
      { Icon: AccountsIcon, label: 'Add your accounts', text: 'Banks, pensions and policies, one clear picture.' },
      { Icon: DocIcon,      label: 'Fill your vault',   text: 'Wills, deeds and documents, encrypted and safe.' },
    ],
  },
  {
    title: 'Choose who sees what.',
    sub: 'Invite the people you trust from the Family tab, each person gets exactly the access you choose.',
    points: [
      { Icon: FamilyIcon, label: 'Trusted contacts', text: 'Spouse, executors, advisers, each with their own role.' },
      { Icon: HeartIcon,  label: 'On your terms',    text: "Share now, or only after you're gone. Nothing without your say-so." },
    ],
  },
  {
    title: 'And when you need more.',
    sub: 'Everything else lives under More, private and locked behind your passcode.',
    points: [
      { Icon: MessageIcon, label: 'Personal messages', text: 'Sealed letters for the people you love.' },
      { Icon: SparkIcon,   label: 'Your AI assistant', text: 'Gentle help organising it all, whenever you ask.' },
    ],
  },
]

export default function AppIntro({ onDone }) {
  const [step, setStep] = useState(0)
  const s = STEPS[step]
  const last = step === STEPS.length - 1

  const finish = () => { markIntroSeen(); onDone() }
  const next = () => { haptic.tick(); last ? finish() : setStep(n => n + 1) }

  return (
    <div className="ob grain">
      <div className="hero-glow" />
      {!last && <button className="skip" onClick={finish}>Skip</button>}

      <div className="f1 fx col jc posrel">
        {s.logo
          ? <img src="/logo-v2-white.png" alt="Everstead" style={{ height: 44, width: 'auto', alignSelf: 'flex-start', marginBottom: 26 }} />
          : <div className="eyebrow eyebrow-sage">Getting started</div>}
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
          {last ? 'Start my plan' : step === 0 ? 'Show me around' : 'Continue'}
        </button>
        {step > 0 && !last && (
          <button className="linkbtn" onClick={() => setStep(n => n - 1)}>Back</button>
        )}
      </div>
    </div>
  )
}
