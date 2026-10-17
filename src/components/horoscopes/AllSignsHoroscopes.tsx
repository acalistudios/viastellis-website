/**
 * AllSignsHoroscopes — today's reading for all 12 signs, with a Western (Sun) ↔
 * Vedic (Moon) toggle, for the viewer's local date.
 *
 * Shared by the public /horoscopes page (marketing nav, SEO, sign-up CTA) and
 * the in-app /signs screen (app frame with "← Home", no sign-up pitch).
 */

import { useEffect, useMemo, useState } from 'react'
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

/** The viewer's LOCAL date as YYYY-MM-DD. */
function localDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
  /** 'public' = big centred marketing header; 'app' = left-aligned like other app screens. */
  variant?: 'public' | 'app'
}

export function AllSignsHoroscopes({ variant = 'public' }: Props) {
  const [system, setSystem] = useState<HoroscopeSystem>('western')
  const [data, setData] = useState<PublicHoroscope[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const date = useMemo(() => localDateStr(), [])
  const isApp = variant === 'app'

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
    <>
      {/* Header */}
      <div className={isApp ? 'text-left' : 'text-center'}>
        <h1 className={isApp ? 'font-display text-2xl text-stardust-300' : 'font-display text-4xl text-stardust-300'}>
          {isApp ? 'All Horoscopes' : "Today's Horoscopes"}
        </h1>
        <p className="text-slate-400 text-sm mt-1">{prettyDate}</p>

        {/* System toggle */}
        <div className={`inline-flex bg-[#0a0e27]/60 rounded-full p-1 border border-stardust-400/15 ${isApp ? 'mt-4' : 'mt-6'}`}>
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
        <p className={`text-slate-500 text-xs mt-3 max-w-md ${isApp ? '' : 'mx-auto'}`}>
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
        <div className={`grid sm:grid-cols-2 gap-4 ${isApp ? 'mt-6' : 'mt-10'}`}>
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
    </>
  )
}
