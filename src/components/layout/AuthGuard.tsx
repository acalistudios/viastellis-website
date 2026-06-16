/**
 * AuthGuard — wraps routes that require authentication and optionally a primary birth chart.
 *
 * Routing logic:
 *   - Still loading session  → spinner (avoids flash of wrong page)
 *   - Not signed in          → /auth
 *   - Signed in, no chart    → /onboarding  (only if requireChart=true)
 *   - Signed in, has chart   → render children / <Outlet />
 *
 * When requireChart=false (used for /onboarding itself):
 *   - Not signed in    → /auth
 *   - Has chart already → / (skip re-onboarding)
 *   - No chart yet     → render children (the form)
 */

import { type ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useUser } from '@/store/UserContext'

interface AuthGuardProps {
  /**
   * Chart requirement for this route:
   *   true   → must have a primary chart (else → /onboarding). Main app routes.
   *   false  → must NOT have a chart yet (else → /home). The onboarding guard.
   *   'any'  → signed-in only; render regardless of chart. e.g. /upgrade.
   */
  requireChart?: boolean | 'any'
  /**
   * Pass children to wrap a single component.
   * Omit children to wrap a Route with <Outlet />.
   */
  children?: ReactNode
}

export function AuthGuard({ requireChart = false, children }: AuthGuardProps) {
  const { session, hasPrimaryChart, loading } = useUser()

  // Still hydrating — blank spinner to avoid redirect flicker
  if (loading) {
    return (
      <div className="min-h-screen bg-cosmos-950 flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-2 border-stardust-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  // Not authenticated → go to /auth
  if (!session) {
    return <Navigate to="/auth" replace />
  }

  const render = () => (children ? <>{children}</> : <Outlet />)

  // 'any' → signed-in is enough; don't care about chart state
  if (requireChart === 'any') {
    return render()
  }

  if (requireChart) {
    // Signed in but no primary chart → collect birth data first
    if (!hasPrimaryChart) {
      return <Navigate to="/onboarding" replace />
    }
    return render()
  }

  // requireChart=false → this IS the onboarding guard
  // User already completed onboarding → skip back to home
  if (hasPrimaryChart) {
    return <Navigate to="/home" replace />
  }

  return render()
}
