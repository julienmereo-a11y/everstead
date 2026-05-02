import React from 'react'

// Single shimmer bar
export function SkeletonBar({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-stone-200 ${className}`}
      aria-hidden="true"
    />
  )
}

// Generic card skeleton with a header + rows
export function SkeletonCard({ rows = 3, className = '' }) {
  return (
    <div className={`bg-white border border-stone-200 rounded-2xl p-5 space-y-3 ${className}`} aria-hidden="true">
      <div className="flex items-center justify-between mb-2">
        <SkeletonBar className="h-4 w-32" />
        <SkeletonBar className="h-3 w-16" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonBar className="h-8 w-8 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBar className="h-3 w-3/4" />
            <SkeletonBar className="h-2.5 w-1/2" />
          </div>
          <SkeletonBar className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// Row-only skeleton (for tables / list sections)
export function SkeletonRows({ rows = 4, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true" aria-label="Loading…">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 bg-white border border-stone-100 rounded-xl px-5 py-4">
          <SkeletonBar className="h-9 w-9 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBar className="h-3.5 w-2/5" />
            <SkeletonBar className="h-2.5 w-1/3" />
          </div>
          <SkeletonBar className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// Stats row skeleton (overview cards)
export function SkeletonStats({ count = 4, className = '' }) {
  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-stone-200 rounded-xl p-5 space-y-3 animate-pulse">
          <SkeletonBar className="h-8 w-8 rounded-lg" />
          <SkeletonBar className="h-7 w-12" />
          <SkeletonBar className="h-2.5 w-28" />
          <SkeletonBar className="h-1 w-full rounded-full" />
        </div>
      ))}
    </div>
  )
}
