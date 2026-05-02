import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h1 className="font-display text-3xl font-light text-navy-950 mb-3">Something went wrong</h1>
          <p className="text-stone-500 text-sm leading-relaxed mb-8">
            An unexpected error occurred. Your data is safe — please refresh or return to the homepage.
            If the problem persists, contact{' '}
            <a href="mailto:support@everstead.care" className="text-navy-700 underline">support@everstead.care</a>.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
              className="inline-flex items-center gap-2 bg-navy-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-navy-700 transition-colors"
            >
              <RefreshCw size={14} /> Refresh page
            </button>
            <button
              onClick={() => { window.location.href = '/' }}
              className="inline-flex items-center gap-2 border border-stone-200 text-stone-600 text-sm font-medium px-5 py-2.5 rounded-xl hover:border-navy-300 hover:text-navy-800 transition-colors"
            >
              Go to homepage
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-8 text-left text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 overflow-auto max-h-40">
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      </div>
    )
  }
}
