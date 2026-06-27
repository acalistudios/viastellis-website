/**
 * PublicHoroscopesPage — a public, no-signup "Today's Horoscopes" demo.
 * All 12 signs, with a Western (Sun) ↔ Vedic (Moon) toggle, for the visitor's
 * local date. Doubles as a marketing/SEO front door; the real demo, vs. the old
 * "demo" button that just bounced people to login.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Starfield } from '@/components/ui/Starfield'
import { getPublicHoroscopes, type HoroscopeSystem, type PublicHoroscope } from '@/lib/publicHoroscopes'

const SIGN_GLYPHS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
}
const ORDER = Object.keys(SIGN_GLYPHS)

/** The visitor's LOCAL date as YYYY-MM-DD. */
function localDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function PublicHoroscopesPage() {
  const [system, setSystem] = useState<HoroscopeSystem>('western')
  const [data, setData] = useState<PublicHoroscope[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const date = useMemo(localDateStr, [])

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
      <Starfield count={90} />
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-block" aria-label="ViaStellis home">
            <img src="/logo.svg" alt="" className="w-12 h-12 mx-auto mb-3" />
          </Link>
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
              ? 'Western readings use your tropical Sun sign — the one in most horoscopes.'
              : 'Vedic readings use your sidereal Moon sign (rashi) — the traditional Indian basis.'}
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
