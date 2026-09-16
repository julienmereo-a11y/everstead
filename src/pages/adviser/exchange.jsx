// Portal screen: the two directions a document moves between an organisation
// and a person. Sending puts one into their vault; asking gets time-limited
// sight of one of theirs. They sit together because they are the same
// relationship seen from either end.
import React, { useState } from 'react'
import { Download, Eye, History, Upload } from 'lucide-react'
import { SendPanel } from './send'
import { RequestPanel } from './request'
import { HistoryPanel } from './history'
import { VisiblePanel } from './visible'

const TABS = [
  { id: 'send',    label: 'Send a document', Icon: Upload },
  { id: 'ask',     label: 'Ask for a document', Icon: Download },
  { id: 'history', label: 'History', Icon: History },
  { id: 'visible', label: 'What you can see', Icon: Eye },
]

export function ExchangeScreen({ firm, isDemo, initialTab = 'send' }) {
  const [tab, setTab] = useState(initialTab)
  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl font-light text-navy-950 m-0 mb-5">Documents</h1>
      <div className="flex gap-1 mb-6 border-b border-stone-200">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id ? 'border-navy-700 text-navy-950' : 'border-transparent text-stone-500 hover:text-navy-800'
            }`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>
      {tab === 'send' ? <SendPanel firm={firm} isDemo={isDemo} />
        : tab === 'ask' ? <RequestPanel firm={firm} isDemo={isDemo} />
        : tab === 'history' ? <HistoryPanel firm={firm} isDemo={isDemo} />
        : <VisiblePanel firm={firm} isDemo={isDemo} />}
    </div>
  )
}
