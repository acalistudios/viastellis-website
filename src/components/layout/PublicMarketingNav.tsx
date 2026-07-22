import { Link } from 'react-router-dom'
import { useUser } from '@/store/UserContext'

export function PublicMarketingNav() {
  const { session } = useUser()

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-b from-[#0f0817]/90 to-transparent backdrop-blur-md border-b border-stardust-400/10 px-6 py-4 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-2xl font-display text-stardust-300 flex items-center gap-2 hover:text-stellar-300 transition-colors">
          <img src="/logo-mark.svg" alt="" className="w-8 h-8" /> ViaStellis
        </Link>
        <nav className="flex items-center gap-5 sm:gap-8 text-sm">
          <a href="/#offerings" className="hidden sm:inline text-slate-400 hover:text-stardust-300 transition-colors font-medium">
            Features
          </a>
          <a href="/#pricing" className="hidden sm:inline text-slate-400 hover:text-stardust-300 transition-colors font-medium">
            Pricing
          </a>
          <Link
            to="/horoscopes"
            className="hidden sm:inline text-slate-400 hover:text-stardust-300 transition-colors font-medium"
          >
            Free Horoscopes
          </Link>
          <Link
            to="/match"
            className="hidden md:inline text-slate-400 hover:text-stardust-300 transition-colors font-medium"
          >
            Free Match
          </Link>
          <Link
            to={session ? '/home' : '/auth'}
            className="whitespace-nowrap px-4 sm:px-6 py-2 bg-gradient-to-r from-stardust-400/20 to-stellar-300/20 hover:from-stardust-400/30 hover:to-stellar-300/30 border border-stardust-400/50 text-stardust-300 rounded-full text-sm font-semibold transition-all hover:shadow-lg hover:shadow-stardust-400/20"
          >
            {session ? 'Go to App' : 'Sign In'}
          </Link>
        </nav>
      </div>
    </header>
  )
}
