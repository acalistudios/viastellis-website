import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Star, Calendar, MessageCircle, Menu, Users, HelpCircle, BookOpen, Crown, Settings, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const CORE_ITEMS = [
  { to: '/home',     icon: Home,          label: 'Home' },
  { to: '/chart',    icon: Star,          label: 'Chart' },
  { to: '/calendar', icon: Calendar,      label: 'Calendar' },
  { to: '/stella',   icon: MessageCircle, label: 'Stella' },
]

const MORE_ITEMS = [
  { to: '/compatibility', icon: Users,      label: 'Vibe Match' },
  { to: '/decision',      icon: HelpCircle, label: 'Dilemma Decider' },
  { to: '/journal',       icon: BookOpen,   label: 'Cosmic Journal' },
  { to: '/upgrade',       icon: Crown,      label: 'Go Premium' },
  { to: '/settings',      icon: Settings,   label: 'Settings' },
]

export function BottomNav() {
  const [showMore, setShowMore] = useState(false)

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 bg-cosmos-900 border-t border-cosmos-700 z-50 print:hidden shadow-2xl">
        <ul className="flex justify-around items-center h-16 px-2">
          {CORE_ITEMS.map(({ to, icon: Icon, label }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                onClick={() => setShowMore(false)}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-0.5 py-2 text-xs transition-colors',
                    isActive && !showMore
                      ? 'text-stardust-300'
                      : 'text-slate-500 hover:text-slate-300'
                  )
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}

          {/* More menu item toggle */}
          <li className="flex-1">
            <button
              onClick={() => setShowMore(p => !p)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 text-xs transition-colors w-full cursor-pointer',
                showMore
                  ? 'text-stardust-300'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Menu size={20} />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* More menu bottom sheet overlay */}
      {showMore && (
        <div className="fixed inset-0 bg-[#07050f]/80 backdrop-blur-sm z-40 flex flex-col justify-end" onClick={() => setShowMore(false)}>
          <div
            className="bg-cosmos-900 border-t border-cosmos-700 rounded-t-3xl p-6 shadow-2xl max-w-lg mx-auto w-full transition-all duration-300 transform translate-y-0"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-medium">More Cosmic Tools</p>
              <button
                onClick={() => setShowMore(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-full hover:bg-cosmos-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Links list */}
            <div className="grid grid-cols-2 gap-4 pb-12">
              {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setShowMore(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 p-3.5 rounded-2xl border text-sm transition-all',
                      isActive
                        ? 'bg-stardust-400/10 border-stardust-400/40 text-stardust-300'
                        : 'bg-cosmos-800/50 border-cosmos-800 text-slate-300 hover:bg-cosmos-800 hover:border-cosmos-700'
                    )
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="font-medium">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
