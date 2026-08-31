import React, { useState, useRef, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Send, Loader2, ArrowLeft, Heart, Mail } from 'lucide-react'
import EmailCaptureCard from '../components/EmailCaptureCard'
import Markdown from '../components/Markdown'

// ─────────────────────────────────────────────────────────────────────────────
// WHEN SOMEONE DIES — Free public AI guide
// No login required. Full-screen chat interface.
// ─────────────────────────────────────────────────────────────────────────────

// Copy per language, chosen from the URL tree (the page renders under both
// basenames). The FR side is not a translation: the steps, the FAQ schema and
// the assistant's server prompt (griefGuideFrPrompt) all carry FRENCH
// procedure, because gov.uk has no mairie and France has no Tell Us Once.
const COPY = {
  en: {
    metaTitle: 'What to do when someone dies | Free UK guide | Everstead',
    metaDesc: 'A free, compassionate AI guide to help you navigate the practical steps after a death in the UK, from registering the death to sorting the estate.',
    headerLabel: 'What to do when someone dies',
    back: 'Back to Everstead',
    h1: 'What to do when someone dies',
    sub: 'A free, compassionate guide through the practical steps after a death in the UK. No sign-up needed, just ask.',
    emailLink: 'Or have the full written guide emailed to you',
    checklistLink: null,
    thinking: 'Thinking…',
    placeholder: "Ask anything: I'm here to help…",
    error: "I'm sorry, something went wrong on my end. Please try again in a moment.",
    opening: "I'm so sorry for your loss. This is one of the hardest things to navigate, and I'm here to help with the practical steps, one at a time, at your own pace.\n\nI can guide you through registering the death, arranging the funeral, notifying banks and the government, dealing with the estate, and much more.\n\nWhere are you right now?",
    disclaimer: 'This is a guide, not legal advice. For complex estates, always seek a solicitor.',
    footerCta: 'Organise your own estate with Everstead \u2192',
    prompts: [
      { label: 'It just happened, what do I do first?', icon: '🕯️' },
      { label: 'The funeral is arranged, what comes next?', icon: '📋' },
      { label: 'I need to notify banks and institutions', icon: '🏦' },
      { label: "I'm dealing with the estate and probate", icon: '⚖️' },
    ],
  },
  fr: {
    metaTitle: 'Que faire après un décès ? | Guide gratuit France | Everstead',
    metaDesc: "Un guide gratuit et bienveillant pour vous accompagner dans les démarches après un décès en France : déclaration, obsèques, banques, organismes et succession.",
    headerLabel: 'Que faire après un décès',
    back: "Retour sur Everstead",
    h1: 'Que faire après un décès',
    sub: "Un guide gratuit et bienveillant à travers les démarches après un décès en France. Sans inscription, posez simplement votre question.",
    emailLink: null,
    checklistLink: 'Ou suivez la liste des démarches, étape par étape',
    thinking: 'Je réfléchis…',
    placeholder: 'Posez votre question, je suis là pour vous aider…',
    error: "Je suis désolé, une erreur est survenue de mon côté. Veuillez réessayer dans un instant.",
    opening: "Je suis sincèrement désolé pour votre perte. C'est l'une des épreuves les plus difficiles à traverser, et je suis là pour vous accompagner dans les démarches, une étape à la fois, à votre rythme.\n\nJe peux vous guider pour la déclaration du décès, les obsèques, les banques et les organismes, la succession, et bien plus.\n\nOù en êtes-vous en ce moment ?",
    disclaimer: "Ce guide est informatif et ne constitue pas un conseil juridique. Pour une succession complexe, consultez un notaire.",
    footerCta: 'Organisez votre propre patrimoine avec Everstead \u2192',
    prompts: [
      { label: "C'est arrivé à l'instant, que faire en premier ?", icon: '🕯️' },
      { label: 'Les obsèques sont organisées, et ensuite ?', icon: '📋' },
      { label: 'Je dois prévenir les banques et les organismes', icon: '🏦' },
      { label: "Je m'occupe de la succession", icon: '⚖️' },
    ],
  },
}

const FAQ_FR = [
  { q: 'Que faire en premier après un décès en France ?', a: "Faire constater le décès par un médecin, qui établit le certificat de décès. En cas de décès soudain ou suspect, la police ou la gendarmerie interviennent. Le décès doit ensuite être déclaré en mairie sous 24 heures, démarche que les pompes funèbres prennent le plus souvent en charge." },
  { q: 'Sous quel délai les obsèques doivent-elles avoir lieu ?', a: "Les obsèques ont lieu entre 24 heures et 6 jours ouvrables après le décès, sauf dérogation préfectorale. Pensez à vérifier si le défunt avait exprimé des volontés ou souscrit un contrat obsèques." },
  { q: 'Faut-il obligatoirement un notaire ?', a: "Le notaire est en pratique indispensable dès qu'il existe un testament, un bien immobilier, un contrat de mariage ou des montants significatifs. Il établit l'acte de notoriété qui prouve la qualité d'héritier auprès des banques et des organismes." },
  { q: 'Comment retrouver une assurance-vie ou un compte oublié ?', a: "La démarche AGIRA, gratuite, permet d'interroger l'ensemble des assureurs pour rechercher un contrat d'assurance-vie. Les avoirs bancaires jamais réclamés sont transférés à la Caisse des Dépôts et consultables via le service Ciclade." },
]

export default function WhenSomeoneDies() {
  const lang = typeof window !== 'undefined' && (window.location.pathname.startsWith('/fr/') || window.location.pathname === '/fr' || window.location.pathname.startsWith('/assistant-apres-deces')) ? 'fr' : 'en'
  const C = COPY[lang]
  const [messages, setMessages] = useState([
    { role: 'assistant', content: C.opening },
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [showEmailCapture, setShowEmailCapture] = useState(false)
  const messagesEndRef        = useRef(null)
  const inputRef              = useRef(null)

  // Only scroll to bottom after the user has sent at least one message
  useEffect(() => {
    if (messages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const send = async (text) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || loading) return

    const next = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res  = await fetch('/api/ai/assist', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'grief-guide', lang, messages: next }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || `Server error ${res.status}`)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: C.error,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const hasStarted = messages.some(m => m.role === 'user')
  const pageUrl = lang === 'fr'
    ? 'https://www.everstead.care/fr/assistant-apres-deces'
    : 'https://www.everstead.care/what-to-do-when-someone-dies'

  return (
    <>
      <Helmet>
        <title>{C.metaTitle}</title>
        <meta
          name="description"
          content={C.metaDesc}
        />
        <link rel="canonical" href={pageUrl} />
        <link rel="alternate" hrefLang="en-GB" href="https://www.everstead.care/what-to-do-when-someone-dies" />
        <link rel="alternate" hrefLang="fr" href="https://www.everstead.care/fr/assistant-apres-deces" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={C.metaTitle} />
        <meta property="og:description" content={C.metaDesc} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(lang === 'fr' ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ_FR.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        } : {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'What do I do first when someone dies in the UK?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'First, contact a GP or call 111 if the death occurred at home. The doctor will issue a Medical Certificate of Cause of Death (MCCD). If the death was sudden or unexpected, the coroner will be involved. You must register the death within 5 days at the local register office.',
              },
            },
            {
              '@type': 'Question',
              name: 'How do I register a death in the UK?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Register the death at the local register office in the district where the death occurred. You will need the Medical Certificate of Cause of Death. You will receive a Death Certificate, order at least 10 certified copies as most institutions require originals.',
              },
            },
            {
              '@type': 'Question',
              name: 'Do I need probate?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Most estates where assets are held in sole names require a Grant of Probate. Estates under approximately £10,000 or with only jointly-held assets may not need probate. Apply through the Probate Registry at gov.uk.',
              },
            },
            {
              '@type': 'Question',
              name: 'What is Tell Us Once?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Tell Us Once is a free government service (gov.uk) that notifies multiple government departments (including DWP, HMRC, DVLA, and the passport office) about a death in a single step. It saves dozens of individual calls.',
              },
            },
          ],
        })}</script>
      </Helmet>

      <div className="h-screen flex flex-col bg-stone-50">

        {/* ── Header ── */}
        <header className="shrink-0 bg-white border-b border-stone-100 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Back to Everstead">
              <img src="/logo-v2-dark.png" alt="Everstead" className="h-8 w-auto" />
            </Link>
            <div className="hidden sm:block w-px h-5 bg-stone-200" />
            <p className="hidden sm:block text-sm text-stone-500 font-medium">
              {C.headerLabel}
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-navy-700 transition-colors"
          >
            <ArrowLeft size={13} /> {C.back}
          </Link>
        </header>

        {/* ── Intro — visible before user starts chatting ── */}
        {!hasStarted && (
          <div className="shrink-0 bg-white border-b border-stone-100 px-4 sm:px-6 py-6 text-center">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-stone-100 mb-3">
              <Heart size={20} className="text-stone-400" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-light text-navy-950 mb-1.5">
              {C.h1}
            </h1>
            <p className="text-stone-500 text-sm max-w-md mx-auto leading-relaxed">
              {C.sub}
            </p>

            {lang === 'fr' ? (
              <Link
                to="/apres-un-deces"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-sage-700 hover:text-sage-800 underline underline-offset-2 transition-colors"
              >
                <Mail size={12} /> {C.checklistLink}
              </Link>
            ) : !showEmailCapture ? (
              <button
                onClick={() => setShowEmailCapture(true)}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-sage-700 hover:text-sage-800 underline underline-offset-2 transition-colors"
              >
                <Mail size={12} /> {C.emailLink}
              </button>
            ) : (
              <div className="mt-5 max-w-xl mx-auto text-left">
                <EmailCaptureCard
                  source="when-someone-dies"
                  title="Get the full guide by email"
                  subtitle="A clear, sequenced step-by-step you can save or forward. Save it for when you need it, or for someone who does."
                  buttonLabel="Email me the guide"
                />
              </div>
            )}
          </div>
        )}

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-4">

            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <img src="/favicon.png" alt="" className="w-7 h-7 rounded-xl object-cover shrink-0 mr-2.5 mt-0.5" />
                )}
                <div
                  className={`max-w-[86%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-navy-800 text-white rounded-br-sm whitespace-pre-line'
                      : 'bg-white border border-stone-200 text-navy-900 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? <Markdown>{msg.content}</Markdown> : msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-start justify-start">
                <img src="/favicon.png" alt="" className="w-7 h-7 rounded-xl object-cover shrink-0 mr-2.5 mt-0.5" />
                <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 shadow-sm">
                  <Loader2 size={14} className="animate-spin text-stone-400" />
                  <span className="text-xs text-stone-400">{C.thinking}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Quick prompts — only before first user message ── */}
        {!hasStarted && (
          <div className="shrink-0 bg-stone-50 border-t border-stone-100 px-4 sm:px-6 py-3">
            <div className="max-w-2xl mx-auto flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {C.prompts.map(({ label, icon }) => (
                <button
                  key={label}
                  onClick={() => send(label)}
                  disabled={loading}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-navy-700 bg-white border border-stone-200 hover:border-navy-300 hover:bg-navy-50 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  <span>{icon}</span>
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input ── */}
        <div className="shrink-0 bg-white border-t border-stone-100 px-4 sm:px-6 py-3">
          <div className="max-w-2xl mx-auto flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={C.placeholder}
              disabled={loading}
              aria-label="Your message"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="shrink-0 bg-navy-800 text-white px-4 py-3 rounded-xl hover:bg-navy-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 bg-white border-t border-stone-100 px-4 sm:px-6 py-2.5 text-center">
          <p className="text-xs text-stone-400">
            {C.disclaimer}
            {' '}·{' '}
            <Link
              to="/get-started"
              className="text-navy-600 hover:text-navy-800 underline underline-offset-2 transition-colors"
            >
              {C.footerCta}
            </Link>
          </p>
        </div>

      </div>
    </>
  )
}
