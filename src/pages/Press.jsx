import React from 'react'
import { Helmet } from 'react-helmet-async'
import { useReveal } from '../components/useReveal'
import HreflangLinks from '../components/HreflangLinks'
import i18n from '../i18n'
import { ArrowRight, Mail } from 'lucide-react'

// Bilingual page: /press (EN) and /fr/press (FR, canonical), plus the vanity
// alias /presse which also renders French. The two kits are siblings, not
// translations: facts, pricing and story angles differ by market.
const COPY = {
  en: {
    metaTitle: 'Press & Media | Everstead',
    metaDesc: 'Press kit, company facts, and media enquiries for Everstead, the secure personal vault for families in the UK and France.',
    eyebrow: 'Press & Media',
    h1: 'Everything that matters, in one place.',
    heroSub: 'For press enquiries, interview requests, or to request our press kit, contact us below. We typically respond within one business day.',
    factsTitle: 'Company facts',
    facts: [
      { label: 'Founded', value: '2025' },
      { label: 'Founder', value: 'Julien Thuy' },
      { label: 'Headquarters', value: 'London, United Kingdom' },
      { label: 'Company', value: 'Everstead Digital Ltd · No. 17166825 (England & Wales)' },
      { label: 'Markets', value: 'United Kingdom & France' },
      { label: 'Platforms', value: 'Web, iOS & Android' },
      { label: 'Languages', value: 'English & French' },
      { label: 'Pricing', value: 'Free plan · Everstead+ £9.99/month or £95.88/year' },
      { label: 'Website', value: 'everstead.care' },
    ],
    aboutTitle: 'About Everstead',
    boilerplate: "Everstead is a secure personal vault: a single, organised place for accounts, documents, wishes and personal messages, with controlled access for the people you trust. Founded in 2025 by Julien Thuy after watching families struggle to piece together a loved one's affairs under enormous stress, Everstead helps members get organised today and protects their loved ones when it counts. The platform is available in the United Kingdom and, since 2026, in France, fully in French, on the web, iPhone and Android. Everstead also publishes free public tools, including an AI assistant that guides families through the practical steps after a death. Everstead Digital Ltd is registered in England and Wales (No. 17166825).",
    founderTitle: 'Founder',
    founderRole: 'Founder & CEO, Everstead',
    founderQuote: 'When my grandmother died, we found a small notebook in a drawer: her accounts, her passwords, everything we needed to know. That notebook was an act of love. Everstead is its safe version.',
    founderBio: "Julien built Everstead after witnessing first-hand the chaos and grief that follows when a family has no organised record of a loved one's affairs. He is based in London and available for interviews, podcasts, and speaking engagements, in English and French, on digital estate planning, personal finance organisation, and family preparedness.",
    founderCta: 'Request an interview',
    toolsTitle: 'Free public tools',
    toolsSub: 'Open to everyone, no sign-up needed:',
    tools: [
      { label: 'What to do when someone dies, a free AI guide through the practical steps after a death in the UK', href: 'https://www.everstead.care/what-to-do-when-someone-dies' },
      { label: "The executor's checklist, interactive and printable, for England and Wales", href: 'https://www.everstead.care/executor-checklist' },
      { label: 'The Estate Readiness Score, a five-question quiz with a score out of 100', href: 'https://www.everstead.care/estate-readiness-score' },
    ],
    anglesTitle: 'Story angles',
    anglesSub: 'Topics we can speak to with data, insight, or a founder perspective:',
    angles: [
      'The "digital estate" problem, billions in unclaimed assets, millions of families unprepared',
      'Why most people still store important information in their heads (or a drawer)',
      'How to talk to your family about estate planning without it being morbid',
      'The rise of personal vaults, organising your life, not just your death',
      'What executors actually wish they had access to',
      'AI, privacy, and sensitive life data, where should it live?',
      'Launching in France: what a UK company learns from French succession rules',
    ],
    assetsTitle: 'Brand assets',
    assetsBody: 'Logos, screenshots, and brand guidelines are available on request. Please email us before publishing any Everstead brand assets.',
    assetsNote: 'For full-resolution files and brand guidelines, email hello@everstead.care',
    contactTitle: 'Media enquiries',
    contactBody: 'For press, interview, and speaking requests, contact Julien directly. We respond to all media enquiries within one business day.',
    contactLines: ['+44 20 4514 2966', 'Everstead Digital Ltd, Vantage Point, 2 Junction Road, London N19 5FF, United Kingdom'],
    mailSubject: 'Press%20enquiry',
    interviewSubject: 'Interview%20request',
  },
  fr: {
    metaTitle: 'Presse et médias | Everstead',
    metaDesc: "Dossier de presse, fiche d'identité et contact médias d'Everstead, le coffre-fort personnel sécurisé des familles, au Royaume-Uni et en France.",
    eyebrow: 'Presse et médias',
    h1: 'Tout ce qui compte, au même endroit.',
    heroSub: "Pour toute demande presse, interview ou dossier de presse, contactez-nous ci-dessous. Nous répondons généralement sous un jour ouvré.",
    factsTitle: "Fiche d'identité",
    facts: [
      { label: 'Fondation', value: '2025' },
      { label: 'Fondateur', value: 'Julien Thuy' },
      { label: 'Siège', value: 'Londres, Royaume-Uni' },
      { label: 'Société', value: 'Everstead Digital Ltd · n° 17166825 (Angleterre et pays de Galles)' },
      { label: 'Marchés', value: 'Royaume-Uni et France' },
      { label: 'Plateformes', value: 'Web, iOS et Android' },
      { label: 'Langues', value: 'Français et anglais' },
      { label: 'Tarifs France', value: 'Offre gratuite · Everstead+ à 9,99 € par mois ou 99,99 € par an (TTC)' },
      { label: 'Site', value: 'everstead.care/fr' },
    ],
    aboutTitle: "À propos d'Everstead",
    boilerplate: "Everstead est un coffre-fort personnel sécurisé : un endroit unique et organisé où réunir ses comptes, ses documents, ses souhaits et ses messages pour ses proches, avec un accès contrôlé pour les personnes de confiance. Fondé en 2025 par Julien Thuy, Everstead est né d'un constat simple : au décès d'un proche, les familles passent des mois à reconstituer une vie entière, dans le deuil et sans mode d'emploi. La plateforme aide chacun à s'organiser aujourd'hui, et protège ses proches le jour où cela compte. Everstead est disponible au Royaume-Uni et, depuis 2026, en France, en français, sur le web, iPhone et Android. Everstead publie aussi des outils gratuits, dont un assistant IA qui guide les familles dans les démarches après un décès. Everstead Digital Ltd est enregistrée en Angleterre et au pays de Galles (n° 17166825).",
    founderTitle: 'Le fondateur',
    founderRole: "Fondateur et CEO d'Everstead",
    founderQuote: "À la mort de ma grand-mère, nous avons trouvé dans un tiroir un petit carnet : ses comptes, ses mots de passe, tout ce qu'il fallait savoir. Ce carnet était un acte d'amour. Everstead en est la version sûre.",
    founderBio: "Julien Thuy a créé Everstead en 2025 après avoir vu de près le chaos administratif qui suit un décès quand rien n'a été préparé. Basé à Londres, il est disponible pour interviews, podcasts et interventions, en français et en anglais, sur la transmission du patrimoine numérique et la préparation des familles.",
    founderCta: 'Demander une interview',
    toolsTitle: 'Des outils gratuits, ouverts à tous',
    toolsSub: 'Sans inscription, pensés pour la France :',
    tools: [
      { label: "L'assistant après un décès, une IA gratuite et bienveillante qui répond aux questions des familles sur les démarches", href: 'https://www.everstead.care/fr/assistant-apres-deces' },
      { label: 'La liste des démarches après un décès en France, interactive et imprimable', href: 'https://www.everstead.care/fr/apres-un-deces' },
      { label: "Le blog : des guides clairs sur la succession, l'assurance-vie et la vie numérique", href: 'https://www.everstead.care/fr/resources/blog' },
    ],
    anglesTitle: 'Idées de sujets',
    anglesSub: "Des angles que nous pouvons nourrir de données, d'expérience terrain ou d'un regard de fondateur :",
    angles: [
      "Ciclade, loi Eckert : pourquoi tant d'argent ne trouve jamais ses héritiers",
      "Le patrimoine numérique, l'angle mort de la succession",
      'Comment parler de transmission à sa famille sans parler de mort',
      "Ce que les proches auraient aimé trouver, selon ceux qui ont réglé une succession",
      "IA et données sensibles : où doit vivre la mémoire d'une vie ?",
    ],
    assetsTitle: 'Logos et visuels',
    assetsBody: "Logos, captures d'écran et charte graphique sont disponibles sur demande. Merci de nous écrire avant toute publication de visuels Everstead.",
    assetsNote: 'Pour les fichiers haute définition et la charte graphique, écrivez à hello@everstead.care',
    contactTitle: 'Contact presse',
    contactBody: "Pour toute demande presse, interview ou intervention, contactez directement Julien. Nous répondons à toutes les demandes médias sous un jour ouvré.",
    contactLines: ['+44 20 4514 2966', 'Everstead Digital Ltd, Vantage Point, 2 Junction Road, Londres N19 5FF, Royaume-Uni', 'Directeur de la publication : Julien Thuy'],
    mailSubject: 'Demande%20presse',
    interviewSubject: "Demande%20d'interview",
  },
}

export default function Press() {
  useReveal()
  const lang = i18n.language === 'fr' || window.location.pathname.startsWith('/presse') ? 'fr' : 'en'
  const C = COPY[lang]
  const pageUrl = lang === 'fr' ? 'https://www.everstead.care/fr/press' : 'https://www.everstead.care/press'

  return (
    <>
      <Helmet>
        <title>{C.metaTitle}</title>
        <meta name="description" content={C.metaDesc} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={C.metaTitle} />
        <meta property="og:description" content={C.metaDesc} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      </Helmet>
      <HreflangLinks path="/press" />

      <div className="min-h-screen">
        {/* Hero */}
        <section className="pt-40 pb-20 lg:pt-48 lg:pb-28 grain relative overflow-hidden">
          <div className="absolute inset-0 aurora-bg" />
          <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">{C.eyebrow}</p>
            <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance">
              {C.h1}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-2xl mx-auto">
              {C.heroSub}
            </p>
            <a
              href={`mailto:hello@everstead.care?subject=${C.mailSubject}`}
              className="inline-flex items-center gap-2 mt-8 bg-white text-navy-900 px-6 py-3 rounded-full text-sm font-semibold hover:bg-stone-100 transition-colors"
            >
              <Mail size={15} />
              hello@everstead.care
            </a>
          </div>
        </section>

        <section className="py-24 lg:py-32 bg-stone-50">
          <div className="max-w-5xl mx-auto px-6 lg:px-8 space-y-20">

            {/* Company facts */}
            <div className="reveal">
              <h2 className="font-display text-3xl font-light text-navy-950 mb-8">{C.factsTitle}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {C.facts.map(({ label, value }) => (
                  <div key={label} className="rounded-2xl border border-stone-200 bg-white px-6 py-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">{label}</p>
                    <p className="text-sm font-medium text-navy-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* About / boilerplate */}
            <div className="reveal">
              <h2 className="font-display text-3xl font-light text-navy-950 mb-4">{C.aboutTitle}</h2>
              <p className="text-stone-600 text-sm leading-relaxed max-w-3xl">{C.boilerplate}</p>
            </div>

            {/* Founder */}
            <div className="reveal">
              <h2 className="font-display text-3xl font-light text-navy-950 mb-6">{C.founderTitle}</h2>
              <div className="rounded-2xl border border-stone-200 bg-white px-8 py-7 max-w-xl">
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 font-display text-xl font-light shrink-0">
                    JT
                  </div>
                  <div>
                    <p className="font-semibold text-navy-900">Julien Thuy</p>
                    <p className="text-sm text-stone-500 mb-3">{C.founderRole}</p>
                    <p className="text-sm leading-relaxed text-stone-600">{C.founderBio}</p>
                    <a href={`mailto:hello@everstead.care?subject=${C.interviewSubject}`} className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors">
                      {C.founderCta} <ArrowRight size={13} />
                    </a>
                  </div>
                </div>
                <blockquote className="mt-6 pt-5 border-t border-stone-100 font-display text-lg font-light text-navy-900 leading-relaxed">
                  {'« '}{C.founderQuote}{' »'}
                </blockquote>
              </div>
            </div>

            {/* Free tools */}
            <div className="reveal">
              <h2 className="font-display text-3xl font-light text-navy-950 mb-3">{C.toolsTitle}</h2>
              <p className="text-stone-500 text-sm mb-6">{C.toolsSub}</p>
              <ul className="space-y-3">
                {C.tools.map(tool => (
                  <li key={tool.href} className="flex items-start gap-3 text-sm leading-relaxed text-stone-700">
                    <span className="text-sage-600 mt-0.5 font-bold shrink-0">·</span>
                    <span>
                      {tool.label}{' '}
                      <a href={tool.href} className="text-navy-700 underline underline-offset-2 hover:text-navy-900 transition-colors break-all">{tool.href.replace('https://www.', '')}</a>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Story angles */}
            <div className="reveal">
              <h2 className="font-display text-3xl font-light text-navy-950 mb-3">{C.anglesTitle}</h2>
              <p className="text-stone-500 text-sm mb-6">{C.anglesSub}</p>
              <ul className="space-y-3">
                {C.angles.map(angle => (
                  <li key={angle} className="flex items-start gap-3 text-sm leading-relaxed text-stone-700">
                    <span className="text-sage-600 mt-0.5 font-bold shrink-0">·</span>
                    {angle}
                  </li>
                ))}
              </ul>
            </div>

            {/* Logos / assets */}
            <div className="reveal">
              <h2 className="font-display text-3xl font-light text-navy-950 mb-4">{C.assetsTitle}</h2>
              <p className="text-stone-600 text-sm leading-relaxed mb-6">{C.assetsBody}</p>
              <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
                <div className="rounded-2xl border border-stone-200 bg-navy-950 p-8 flex items-center justify-center">
                  <img src="/logo-v2-white.png" alt="Everstead logo, white" className="h-8 w-auto" />
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-8 flex items-center justify-center">
                  <img src="/logo-v2-dark.png" alt="Everstead logo, dark" className="h-8 w-auto" onError={e => { e.target.style.display='none' }} />
                  <span className="text-stone-300 text-sm font-display">Everstead</span>
                </div>
              </div>
              <p className="mt-4 text-stone-400 text-xs">{C.assetsNote}</p>
            </div>

            {/* Contact */}
            <div className="reveal aurora-field aurora-dim rounded-2xl px-10 py-10 text-center">
              <h2 className="font-display text-2xl font-light text-white mb-3">{C.contactTitle}</h2>
              <p className="text-stone-400 text-sm leading-relaxed mb-6 max-w-md mx-auto">{C.contactBody}</p>
              <a
                href={`mailto:hello@everstead.care?subject=${C.mailSubject}`}
                className="inline-flex items-center gap-2 bg-white text-navy-900 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors"
              >
                <Mail size={15} />
                hello@everstead.care
              </a>
              <div className="mt-5 space-y-1">
                {C.contactLines.map(line => (
                  <p key={line} className="text-stone-400 text-xs">{line}</p>
                ))}
              </div>
            </div>

          </div>
        </section>
      </div>
    </>
  )
}
