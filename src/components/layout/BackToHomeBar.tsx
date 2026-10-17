import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

/**
 * BackToHomeBar — a consistent, always-visible way back to Home.
 *
 * Rendered by AppShell on every screen except Home itself, so no page can ship
 * without an exit. The nav bar's Home tab reads as a tab, not a way out; users
 * look top-left for "back". Always targets /home rather than history(-1): a
 * screen opened from an email link or notification has no in-app history.
 */
export function BackToHomeBar() {
  return (
    <div className="sticky top-0 z-30 h-11 flex items-center px-3 bg-cosmos-950/90 backdrop-blur border-b border-cosmos-800/60 print:hidden">
      <Link
        to="/home"
        className="inline-flex items-center gap-1 rounded-full pl-1.5 pr-3 py-1.5 text-sm font-medium text-stardust-300 hover:text-stardust-200 hover:bg-cosmos-800/70 transition-colors"
      >
        <ChevronLeft size={18} strokeWidth={2} />
        Home
      </Link>
    </div>
  )
}
