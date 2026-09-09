// The homepage is language-split.
//
// English was redesigned (Homepage v2: immersive felt hero, the film, a section
// for advisers and solicitors). French deliberately keeps the previous design
// and copy, so the two live side by side rather than as branches inside one
// component. Both are in the same lazy chunk as this file, so the split costs
// nothing at runtime.
import React from 'react'
import { useTranslation } from 'react-i18next'
import HomeEn from './home/HomeEn'
import HomeFr from './home/HomeFr'

export default function Home() {
  const { i18n } = useTranslation()
  return i18n.language === 'fr' ? <HomeFr /> : <HomeEn />
}
