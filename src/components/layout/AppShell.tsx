import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

/**
 * AppShell wraps all authenticated pages.
 * Renders the persistent bottom navigation and the current page via <Outlet />.
 */
export function AppShell() {
  return (
    <div className="flex flex-col h-full bg-cosmos-950 text-slate-200">
      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Persistent bottom navigation */}
      <BottomNav />
    </div>
  )
}
