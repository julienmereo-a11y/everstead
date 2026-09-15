// Shell for the Everstead for Business tree: its own header, the shared footer.
// Lazy-loaded from App.jsx so the business copy never lands in the family bundle.
import React from 'react'
import BusinessNav from './BusinessNav'
import Footer from './Footer'

export default function BusinessLayout({ children }) {
  return (
    <>
      <BusinessNav />
      <main>{children}</main>
      <Footer />
    </>
  )
}
