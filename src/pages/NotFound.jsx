import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="bg-stone-50 pt-24 min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <p className="font-display text-8xl font-light text-navy-200 mb-6">404</p>
        <h1 className="font-display text-3xl font-light text-navy-950 mb-3">Page not found</h1>
        <p className="text-stone-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-navy-800 text-white font-semibold text-sm px-6 py-3 rounded-lg hover:bg-navy-700 transition-colors"
        >
          Back to home <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )
}
