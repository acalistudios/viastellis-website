/**
 * PublicHoroscopesPage — a public, no-signup "Today's Horoscopes" demo.
 * All 12 signs, with a Western (Sun) ↔ Vedic (Moon) toggle, for the visitor's
 * local date. Doubles as a marketing/SEO front door; the real demo, vs. the old
 * "demo" button that just bounced people to login.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Starfield } from '@/components/ui/Starfield'
import { Seo } from '@/components/Seo'
import { useUser } from '@/store/UserContext'
import { getPublicHoroscopes, type HoroscopeSystem, type PublicHoroscope } from '@/lib/publicHoroscopes'

const SIGN_GLYPHS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
}
const ORDER = Object.keys(SIGN_GLYPHS)

// Tropical Sun-sign date ranges — shown only in Western mode (the Vedic Moon sign
// is not determined by birthdate, so ranges don't apply there).
const SIGN_DATES: Record<string, string> = {
  Aries: 'Mar 21 – Apr 19', Taurus: 'Apr 20 – May 20', Gemini: 'May 21 – Jun 20',
  Cancer: 'Jun 21 – Jul 22', Leo: 'Jul 23 – Aug 22', Virgo: 'Aug 23 – Sep 22',
  Libra: 'Sep 23 – Oct 22', Scorpio: 'Oct 23 – Nov 21', Sagittarius: 'Nov 22 – Dec 21',
  Capricorn: 'Dec 22 – Jan 19', Aquarius: 'Jan 20 – Feb 18', Pisces: 'Feb 19 – Mar 20',
}

/** The visitor's LOCAL date as YYYY-MM-DD. */
function localDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function PublicHoroscopesPage() {
  const { session } = useUser()
  const [system, setSystem] = useState<HoroscopeSystem>('western')
  const [data, setData] = useState<PublicHoroscope[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const date = useMemo(() => localDateStr(), [])

  const prettyDate = useMemo(
    () => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    }),
    [date],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getPublicHoroscopes(system, date)
      .then((res) => { if (!cancelled) setData(res) })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Something went wrong.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [system, date])

  // Keep the zodiac order regardless of what the API returns.
  const ordered = useMemo(
    () => ORDER.map((sign) => data.find((h) => h.sign === sign)).filter(Boolean) as PublicHoroscope[],
    [data],
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0817] via-[#1a1a3f] to-[#0a0e27] text-slate-200 relative overflow-hidden">
      <Seo
        title="Today's Horoscopes — All 12 Signs (Vedic & Western)"
        description="Free daily horoscopes for every zodiac sign, in both Vedic (Moon-sign) and Western (Sun-sign) astrology. No sign-up required — read today's reading for your sign."
        path="/horoscopes"
      />
      <Starfield count={90} />

      {/* Nav bar */}
      <nav className="relative z-20 sticky top-0 bg-[#0f0817]/90 backdrop-blur-md border-b border-stardust-400/10 px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-stardust-300 font-display text-lg hover:text-stardust-200 transition-colors">
          <img src="/logo.svg" alt="" className="w-6 h-6" />
          ViaStellis
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/" className="text-slate-400 hover:text-stardust-300 transition-colors hidden sm:inline">
            ← Back
          </Link>
          <Link
            to={session ? '/home' : '/auth'}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-stardust-400/20 to-stellar-300/20 border border-stardust-400/40 text-stardust-300 hover:border-stardust-400/70 transition-all text-sm font-medium"
          >
            {session ? 'Go to App' : 'Sign In'}
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-4xl text-stardust-300">Today's Horoscopes</h1>
          <p className="text-slate-400 text-sm mt-1">{prettyDate}</p>

          {/* System toggle */}
          <div className="inline-flex bg-[#0a0e27]/60 rounded-full p-1 mt-6 border border-stardust-400/15">
            {([['western', '☀️ Western (Sun)'], ['vedic', '🌙 Vedic (Moon)']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setSystem(val)}
                className={[
                  'px-5 py-2 rounded-full text-sm font-medium transition-all',
                  system === val
                    ? 'bg-gradient-to-r from-stardust-400 to-stellar-300 text-[#0a0e27]'
                    : 'text-slate-400 hover:text-stardust-300',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-slate-500 text-xs mt-3 max-w-md mx-auto">
            {system === 'western'
              ? 'Western readings use your tropical Sun sign — the one in most European and American horoscopes.'
              : 'Vedic readings use your sidereal Moon sign (rashi). Unlike Sun signs, the Moon changes sign every ~2½ days, so there are no fixed birth-date ranges — you need a full chart to know yours.'}
          </p>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="w-8 h-8 rounded-full border-2 border-stardust-400 border-t-transparent animate-spin" />
            <p className="text-slate-500 text-sm">Reading the sky for all 12 signs…</p>
          </div>
        ) : error ? (
          <p className="text-rose-300 text-sm text-center bg-rose-400/10 border border-rose-400/20 rounded-xl px-4 py-3 mt-10 max-w-md mx-auto">
            {error}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 mt-10">
            {ordered.map((h) => (
              <div
                key={h.sign}
                className="bg-[#1a1a3f]/50 backdrop-blur-sm border border-stardust-400/15 rounded-2xl p-5"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-2xl text-stardust-300">{SIGN_GLYPHS[h.sign]}</span>
                  <span className="font-display text-xl text-stardust-200">{h.sign}</span>
                  {system === 'western' && (
                    <span className="text-slate-500 text-xs">{SIGN_DATES[h.sign]}</span>
                  )}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {h.body || 'Today’s reading is being prepared — check back shortly.'}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-12 bg-[#1a1a3f]/40 border border-stardust-400/15 rounded-2xl px-6 py-8">
          <h2 className="font-display text-2xl text-stardust-300">Want it personal?</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-lg mx-auto">
            These are general sign readings. Create your free chart for a reading built from your
            exact birth date, time, and place — plus your full Vedic or Western birth chart, daily
            transits, compatibility, and Stella, your AI astrology guide.
          </p>
          <Link
            to="/auth"
            className="inline-block mt-5 rounded-full px-6 py-3 bg-gradient-to-r from-stardust-400 to-stellar-300 text-[#0a0e27] text-sm font-semibold"
          >
            Create your free chart →
          </Link>
        </div>

        <p className="text-center text-xs text-slate-600 mt-8">
          For reflection and entertainment only.
        </p>
      </div>
    </div>
  )
}
