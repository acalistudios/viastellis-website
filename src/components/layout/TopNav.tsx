import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Star, Users, MessageCircle, Menu, Calendar, HelpCircle, BookOpen, Settings, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/store/UserContext'

// Everyday destinations stay in the bar; deeper tools live under "More".
const CORE_ITEMS = [
  { to: '/home',          icon: Home,          label: 'Home'   },
  { to: '/chart',         icon: Star,          label: 'Chart'  },
  { to: '/compatibility', icon: Users,         label: 'Match'  },
  { to: '/stella',        icon: MessageCircle, label: 'Stella' },
]

const MORE_ITEMS = [
  { to: '/calendar', icon: Calendar,  label: 'Best Days' },
  { to: '/decision', icon: HelpCircle, label: 'Decisions' },
  { to: '/journal',  icon: BookOpen,   label: 'Journal'   },
  { to: '/settings', icon: Settings,   label: 'Settings'  },
]

const itemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors w-full',
    isActive ? 'text-stardust-300' : 'text-slate-500 hover:text-slate-300',
  )

export function TopNav() {
  const { profile } = useUser()
  const isPremium = profile?.subscription_tier === 'premium'
  const credits = profile?.credits_remaining ?? 0
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <nav className="fixed top-0 inset-x-0 bg-cosmos-900/95 backdrop-blur border-b border-cosmos-700 z-50 print:hidden">
      <ul className="flex justify-around items-center h-14 px-1 max-w-2xl mx-auto">
        {CORE_ITEMS.map(({ to, icon: Icon, label }) => (
          <li key={to} className="flex-1">
            <NavLink to={to} className={itemClass}>
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}

        {/* More dropdown */}
        <li className="flex-1 relative">
          <button
            onClick={() => setMoreOpen(o => !o)}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors w-full',
              moreOpen ? 'text-stardust-300' : 'text-slate-500 hover:text-slate-300',
            )}
          >
            <Menu size={17} />
            <span>More</span>
          </button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} aria-hidden />
              <div className="absolute top-full right-0 mt-1 w-48 bg-cosmos-900 border border-cosmos-700 rounded-xl shadow-2xl overflow-hidden z-50">
                {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                        isActive ? 'bg-stardust-400/10 text-stardust-300' : 'text-slate-300 hover:bg-cosmos-800',
                      )
                    }
                  >
                    <Icon size={16} className="shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </>
          )}
        </li>

        {/* Premium — kept distinct as the upgrade affordance */}
        <li className="flex-1">
          <NavLink
            to="/upgrade"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors w-full relative',
                isActive
                  ? isPremium ? 'text-yellow-400' : 'text-stardust-300'
                  : isPremium
                  ? 'text-yellow-500 hover:text-yellow-300'
                  : 'text-slate-500 hover:text-slate-300',
              )
            }
          >
            <div className="relative">
              <Crown size={17} />
              {!isPremium && (
                <span className="absolute -top-1.5 -right-2.5 bg-cosmos-800 text-[8px] text-stellar-300 rounded-full px-1 leading-tight border border-cosmos-600 tabular-nums">
                  {credits}
                </span>
              )}
            </div>
            <span>{isPremium ? 'Premium' : 'Go Premium'}</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}
