import React from 'react'

// Inline line icons ported verbatim from the design handoff prototype
// (1.5px stroke, currentColor). Kept as small components so screens read
// cleanly. `s` = size in px.

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const HomeIcon = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}>
    <path d="M3.5 10L11 3.5 18.5 10v8a1 1 0 01-1 1h-4v-5h-5v5h-4a1 1 0 01-1-1v-8z" />
  </svg>
)

export const AccountsIcon = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}>
    <path d="M3.5 9L11 4.5 18.5 9" />
    <path d="M5.5 9v6M11 9v6M16.5 9v6" />
    <path d="M3.5 17.5h15" />
  </svg>
)

export const VaultIcon = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}>
    <path d="M11 3.5l6.5 2.6v4.6c0 3.6-2.7 6.1-6.5 7.8-3.8-1.7-6.5-4.2-6.5-7.8V6.1L11 3.5z" />
    <circle cx="11" cy="9.7" r="1.6" />
    <path d="M11 11.3v2.5" />
  </svg>
)

export const PlanIcon = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}>
    <path d="M9.5 6h9M9.5 11h9M9.5 16h5" />
    <path d="M3.5 5.5l1.3 1.3L7.5 4M3.5 10.5l1.3 1.3L7.5 9" />
    <circle cx="4.8" cy="16" r="1.2" />
  </svg>
)

export const FamilyIcon = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}>
    <circle cx="8" cy="7.5" r="3" />
    <path d="M2.5 17.5c.6-3 2.6-4.5 5.5-4.5s4.9 1.5 5.5 4.5" />
    <circle cx="15.8" cy="8.5" r="2.3" />
    <path d="M15 13.2c2.5.3 4 1.7 4.5 4.3" />
  </svg>
)

export const MoreIcon = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}>
    <circle cx="7" cy="7" r="1.6" />
    <circle cx="15" cy="7" r="1.6" />
    <circle cx="7" cy="15" r="1.6" />
    <circle cx="15" cy="15" r="1.6" />
  </svg>
)

export const DocIcon = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 20 20" {...stroke}>
    <path d="M5 2.5h6l4 4v11H5z" />
    <path d="M11 2.5v4h4" />
  </svg>
)

export const HeartIcon = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 20 20" {...stroke}>
    <path d="M10 16.5S3.5 12.6 3.5 8.2C3.5 5.8 5.3 4.3 7.2 4.3c1.3 0 2.2.6 2.8 1.5.6-.9 1.5-1.5 2.8-1.5 1.9 0 3.7 1.5 3.7 3.9 0 4.4-6.5 8.3-6.5 8.3z" />
  </svg>
)

export const PlusIcon = ({ s = 11 }) => (
  <svg width={s} height={s} viewBox="0 0 12 12" fill="none">
    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

export const ChevronIcon = ({ s = 12 }) => (
  <svg width={(s * 7) / 12} height={s} viewBox="0 0 7 12" fill="none" className="chev">
    <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const CheckIcon = ({ on }) => (
  <svg className={`ckm ${on ? 'on' : ''}`} width="11" height="10" viewBox="0 0 11 10" fill="none">
    <path d="M1.5 5.5l2.7 2.7L9.5 1.8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const BackIcon = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}><path d="M13.5 5l-6 6 6 6" /></svg>
)
export const UserIcon = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}><circle cx="11" cy="7.5" r="3.2" /><path d="M4.5 18c.8-3.4 3-5 6.5-5s5.7 1.6 6.5 5" /></svg>
)
export const BellIcon = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}><path d="M6 9a5 5 0 0110 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z" /><path d="M9 18.5a2 2 0 004 0" /></svg>
)
export const CardIcon = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}><rect x="3" y="5.5" width="16" height="11" rx="2" /><path d="M3 9h16" /></svg>
)
export const MessageIcon = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}><path d="M4 5.5h14v9H9l-4 3v-3H4z" /></svg>
)
export const ListIcon = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}><path d="M8 6.5h10M8 11h10M8 15.5h10" /><circle cx="4.5" cy="6.5" r="1" /><circle cx="4.5" cy="11" r="1" /><circle cx="4.5" cy="15.5" r="1" /></svg>
)
export const SparkIcon = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}><path d="M11 4l1.6 4.4L17 10l-4.4 1.6L11 16l-1.6-4.4L5 10l4.4-1.6z" /></svg>
)
export const BookIcon = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}><path d="M5 4.5h9a2 2 0 012 2v11H7a2 2 0 00-2 2z" /><path d="M5 4.5v15" /></svg>
)
export const GearIcon = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}><circle cx="11" cy="11" r="2.5" /><path d="M11 3v2.5M11 16.5V19M3 11h2.5M16.5 11H19M5.2 5.2l1.8 1.8M15 15l1.8 1.8M16.8 5.2L15 7M7 15l-1.8 1.8" /></svg>
)
export const ClockIcon = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 22 22" {...stroke}><circle cx="11" cy="11" r="7.5" /><path d="M11 7v4l2.5 1.5" /></svg>
)

export const FaceIdIcon = ({ s = 17 }) => (
  <svg width={s} height={s} viewBox="0 0 20 20" {...stroke}>
    <path d="M2.5 6V4.5a2 2 0 012-2H6M14 2.5h1.5a2 2 0 012 2V6M17.5 14v1.5a2 2 0 01-2 2H14M6 17.5H4.5a2 2 0 01-2-2V14" />
    <path d="M7 7.5v1.5M13 7.5v1.5M10 7.8v2.7h-.8" />
    <path d="M7 13.2c.8.8 1.8 1.2 3 1.2 1.2 0 2.2-.4 3-1.2" />
  </svg>
)
