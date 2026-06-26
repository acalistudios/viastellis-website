import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

/**
 * AppShell wraps all authenticated pages.
 * Renders the persistent bottom navigation and the current page via <Outlet />.
 */
export function AppShell() {
  return (
    <div className="relative flex flex-col h-full bg-cosmos-950 text-slate-200">
      {/* Decorative cosmic side panels — desktop only, behind the content. Kept
          narrow (≤18vw) so the figures aren't stretched or cropped; inner edge fades
          into the background. */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen max-w-[18vw] w-auto z-0 pointer-events-none select-none">
        <img src="/border-left.png" alt="" aria-hidden className="h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, transparent 60%, #04030a 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #04030a 0%, transparent 8%, transparent 92%, #04030a 100%)' }} />
      </div>
      <div className="hidden lg:block fixed right-0 top-0 h-screen max-w-[18vw] w-auto z-0 pointer-events-none select-none">
        <img src="/border-right.png" alt="" aria-hidden className="h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to left, transparent 60%, #04030a 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #04030a 0%, transparent 8%, transparent 92%, #04030a 100%)' }} />
      </div>

      {/* Page content */}
      <main className="relative z-10 flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Persistent bottom navigation */}
      <BottomNav />
    </div>
  )
}
