import { NavLink } from 'react-router-dom'
import { Home, Star, Calendar, Users, HelpCircle, BookOpen, MessageCircle, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/store/UserContext'

const NAV_ITEMS = [
  { to: '/home',          icon: Home,          label: 'Home'     },
  { to: '/chart',         icon: Star,          label: 'Chart'    },
  { to: '/calendar',      icon: Calendar,      label: 'Calendar' },
  { to: '/compatibility', icon: Users,         label: 'Vibe'     },
  { to: '/decision',      icon: HelpCircle,    label: 'Decide'   },
  { to: '/journal',       icon: BookOpen,      label: 'Journal'  },
  { to: '/stella',        icon: MessageCircle, label: 'Stella'   },
]

export function TopNav() {
  const { profile } = useUser()
  const isPremium = profile?.subscription_tier === 'premium'
  const credits = profile?.credits ?? 0

  return (
    <nav className="fixed top-0 inset-x-0 bg-cosmos-900/95 backdrop-blur border-b border-cosmos-700 z-50 print:hidden">
      <ul className="flex justify-around items-center h-14 px-1 max-w-4xl mx-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors w-full',
                  isActive ? 'text-stardust-300' : 'text-slate-500 hover:text-slate-300'
                )
              }
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}

        {/* Premium item */}
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
                  : 'text-slate-500 hover:text-slate-300'
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
