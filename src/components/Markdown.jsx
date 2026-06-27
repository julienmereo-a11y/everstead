import React from 'react'
import ReactMarkdown from 'react-markdown'

// Renders assistant/AI text as Markdown so things like **bold**, lists and
// [links](url) display properly instead of showing raw asterisks.
// react-markdown ignores raw HTML by default, so this is XSS-safe.
const COMPONENTS = {
  a:  (props) => <a {...props} target="_blank" rel="noopener noreferrer" className="underline text-sage-700 hover:text-sage-800 break-words" />,
  p:  (props) => <p {...props} className="my-2 first:mt-0 last:mb-0 leading-relaxed" />,
  ul: (props) => <ul {...props} className="list-disc pl-5 my-2 space-y-1" />,
  ol: (props) => <ol {...props} className="list-decimal pl-5 my-2 space-y-1" />,
  li: (props) => <li {...props} className="leading-relaxed" />,
  strong: (props) => <strong {...props} className="font-semibold" />,
  em: (props) => <em {...props} className="italic" />,
  code: (props) => <code {...props} className="bg-stone-200/70 rounded px-1 py-0.5 text-[0.85em] font-mono" />,
  h1: (props) => <p {...props} className="font-semibold text-[1.05em] my-2" />,
  h2: (props) => <p {...props} className="font-semibold text-[1.02em] my-2" />,
  h3: (props) => <p {...props} className="font-semibold my-2" />,
  blockquote: (props) => <blockquote {...props} className="border-l-2 border-stone-300 pl-3 my-2 text-stone-600" />,
  hr: () => <hr className="my-3 border-stone-200" />,
}

export default function Markdown({ children, className = '' }) {
  return (
    <div className={className}>
      <ReactMarkdown components={COMPONENTS}>{children || ''}</ReactMarkdown>
    </div>
  )
}
