import { NavLink } from 'react-router-dom'
import { Home, Star, Calendar, Users, HelpCircle, BookOpen, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/home',          icon: Home,          label: 'Home'          },
  { to: '/chart',         icon: Star,          label: 'Chart'         },
  { to: '/calendar',      icon: Calendar,      label: 'Calendar'      },
  { to: '/compatibility', icon: Users,         label: 'Vibe'          },
  { to: '/decision',      icon: HelpCircle,    label: 'Decide'        },
  { to: '/journal',       icon: BookOpen,      label: 'Journal'       },
  { to: '/stella',        icon: MessageCircle, label: 'Stella'        },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-cosmos-900 border-t border-cosmos-700 z-50 print:hidden">
      <ul className="flex justify-around items-center h-16 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 text-xs transition-colors',
                  isActive
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
      </ul>
    </nav>
  )
}
