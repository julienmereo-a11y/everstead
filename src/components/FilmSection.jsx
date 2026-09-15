// The Everstead film: one Mux cut per language, shown on the homepage and on
// How it works. Idle is a poster and a play button; the player is only mounted
// on click, so nothing from Mux loads for visitors who never press play. Copy
// lives in the home namespace (film.*) in both languages.
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trackEvent } from '../lib/analytics'

// One Mux asset per language. posterTime is the second the idle poster is
// taken from: a frame where the caption is complete or absent, not mid-animation.
const MUX_FILMS = {
  en: { id: 'v4tV01rS02YxRhGb3c01ZNmDr102EQP2wXJ1HxZy1NvllxQ', posterTime: 5 },
  fr: { id: 'h8sCrh01jP65HdFNidtdE01BNZRb00jsaMTRVx3F4rvpQc', posterTime: 5 },
}

export default function FilmSection({ location = 'home_film', className = 'pt-24 lg:pt-28' }) {
  const { t, i18n } = useTranslation('home')
  const film = i18n.language === 'fr' ? MUX_FILMS.fr : MUX_FILMS.en
  const [playing, setPlaying] = useState(false)

  const play = () => {
    trackEvent('video_play', { location })
    setPlaying(true)
  }

  return (
    <section className={`bg-stone-50 px-6 sm:px-8 lg:px-12 ${className}`}>
      <div className="max-w-[880px] mx-auto flex flex-col items-center gap-10">
        <h2 className="reveal font-display font-light text-navy-950 text-center text-balance leading-[1.1] text-[clamp(2.125rem,3.6vw,3.375rem)]">
          {t('film.title')}
        </h2>

        <div className="reveal w-full relative aspect-video rounded-[28px] overflow-hidden bg-navy-950 shadow-[0_48px_90px_-30px_rgba(13,22,40,0.45)]">
          {playing ? (
            <iframe
              src={`https://player.mux.com/${film.id}?autoplay=true&accent-color=%232d5082&primary-color=%23fafaf9`}
              title={t('film.posterTitle')}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0 bg-navy-950"
            />
          ) : (
            <>
              <button
                type="button"
                onClick={play}
                aria-label={t('film.playAria')}
                className="absolute inset-0 w-full h-full cursor-pointer bg-transparent border-0 p-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage-300"
              />
              <img
                src={`https://image.mux.com/${film.id}/thumbnail.jpg?time=${film.posterTime}&width=1600`}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(180deg, rgba(13,22,40,0.05) 40%, rgba(13,22,40,0.7) 100%)' }}
              />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] rounded-full bg-stone-50/90 flex items-center justify-center shadow-[0_20px_40px_rgba(13,22,40,0.35)] pointer-events-none transition-transform duration-200 group-hover:scale-105">
                <span
                  className="ml-1.5 block w-0 h-0"
                  style={{ borderStyle: 'solid', borderWidth: '14px 0 14px 24px', borderColor: 'transparent transparent transparent #0d1628' }}
                />
              </div>
              <div className="absolute left-5 right-5 sm:left-7 sm:right-7 bottom-5 sm:bottom-6 flex items-end justify-between gap-4 text-stone-50 pointer-events-none">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-sage-300 font-semibold">{t('film.posterEyebrow')}</div>
                  <div className="font-display text-xl sm:text-2xl mt-1">{t('film.posterTitle')}</div>
                </div>
                <span className="shrink-0 text-[13px] px-2.5 py-1 rounded-full bg-stone-50/[0.14] border border-stone-50/25">
                  {t('film.duration')}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
