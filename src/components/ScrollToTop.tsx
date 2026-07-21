import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '@/lib/analytics'

/** Scrolls to top of page (and main content area) on every route change. */
export function ScrollToTop() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    document.getElementById('main-content')?.scrollTo(0, 0)
    trackPageView(`${pathname}${search}`)
  }, [pathname, search])
  return null
}
