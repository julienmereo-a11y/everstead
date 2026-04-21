import { useEffect } from 'react'

export function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.05, rootMargin: '0px 0px 0px 0px' }
    )

    const observeElement = (element) => {
      if (!(element instanceof HTMLElement)) return
      if (!element.classList.contains('reveal')) return
      if (element.dataset.revealBound === '1') return

      element.dataset.revealBound = '1'

      // Always mark in-viewport elements visible immediately
      const rect = element.getBoundingClientRect()
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        element.classList.add('visible')
        return
      }

      observer.observe(element)
    }

    const bindReveals = (root = document) => {
      if (root instanceof HTMLElement && root.classList.contains('reveal')) {
        observeElement(root)
      }

      if ('querySelectorAll' in root) {
        root.querySelectorAll('.reveal').forEach(observeElement)
      }
    }

    bindReveals()

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            bindReveals(node)
          }
        })
      })
    })

    mutationObserver.observe(document.body, { childList: true, subtree: true })

    // Safety fallback: after 800ms force-reveal anything still hidden
    const fallback = setTimeout(() => {
      document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
        el.classList.add('visible')
      })
    }, 800)

    return () => {
      clearTimeout(fallback)
      mutationObserver.disconnect()
      observer.disconnect()
    }
  }, [])
}
