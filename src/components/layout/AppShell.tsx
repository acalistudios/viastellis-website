import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

/**
 * AppShell wraps all authenticated pages.
 * Renders the persistent bottom navigation and the current page via <Outlet />.
 */
export function AppShell() {
  return (
    <div className="relative flex flex-col h-full bg-cosmos-950 text-slate-200">
      {/* Decorative cosmic side panels — desktop only, behind the content */}
      <img
        src="/border-left.png"
        alt=""
        aria-hidden
        className="hidden lg:block fixed left-0 top-0 h-screen w-auto max-w-[18vw] object-cover opacity-70 pointer-events-none select-none z-0"
      />
      <img
        src="/border-right.png"
        alt=""
        aria-hidden
        className="hidden lg:block fixed right-0 top-0 h-screen w-auto max-w-[18vw] object-cover opacity-70 pointer-events-none select-none z-0"
      />

      {/* Page content */}
      <main className="relative z-10 flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Persistent bottom navigation */}
      <BottomNav />
    </div>
  )
}
