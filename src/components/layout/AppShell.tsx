import { Outlet } from 'react-router-dom'
import { TopNav } from './TopNav'
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
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, transparent 60%, #07050f 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #07050f 0%, transparent 8%, transparent 92%, #07050f 100%)' }} />
      </div>
      <div className="hidden lg:block fixed right-0 top-0 h-screen max-w-[18vw] w-auto z-0 pointer-events-none select-none">
        <img src="/border-right.png" alt="" aria-hidden className="h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to left, transparent 60%, #07050f 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #07050f 0%, transparent 8%, transparent 92%, #07050f 100%)' }} />
      </div>

      {/* Persistent top navigation - desktop only */}
      <div className="hidden lg:block">
        <TopNav />
      </div>

      {/* Persistent bottom navigation - mobile only */}
      <div className="lg:hidden">
        <BottomNav />
      </div>

      {/* Page content */}
      <main id="main-content" className="relative z-10 flex-1 overflow-y-auto pt-0 lg:pt-14 pb-16 lg:pb-0">
        <Outlet />
      </main>
    </div>
  )
}
