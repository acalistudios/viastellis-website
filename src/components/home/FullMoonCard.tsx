/**
 * FullMoonCard — shown on the home page when the moon is >= 75% illuminated
 * (roughly the 3 days before, day-of, and 3 days after the full moon).
 * Free on Premium; 40 credits once per month for others.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@/store/UserContext'
import { getMoonReading, moonCycleKey, type MoonReadingContext } from '@/lib/moonReading'
import { getPanchanga } from '@/lib/panchanga'
import { getNakshatra } from '@/lib/ephemeris'
import type { NatalChart } from '@/types'

const COST = 10

interface Props {
  chart: NatalChart
}

export function FullMoonCard({ chart }: Props) {
  const { profile } = useUser()
  const isPremium = profile?.subscription_tier === 'premium'

  // Compute today's moon phase from panchanga
  const { illumination, phaseName, moonSign, moonNakshatra } = useMemo(() => {
    const today = new Date()
    const pan = getPanchanga(today)
    const moon = chart.planets.find(p => p.planet === 'Moon')
    const moonDeg = moon ? (
      ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
        .indexOf(moon.sign) * 30 + moon.degree
    ) : 0
    return {
      illumination: pan.moonPhase.illumination,
      phaseName: pan.moonPhase.name,
      moonSign: moon?.sign ?? '',
      moonNakshatra: getNakshatra(moonDeg).name,
    }
  }, [chart])

  // Only surface during the full-moon window
  if (illumination < 75) return null

  const cycleKey = moonCycleKey()
  const context: MoonReadingContext = {
    name: chart.birth_data.name,
    moon_sign: moonSign,
    moon_nakshatra: moonNakshatra,
    ascendant: chart.birth_data.time_unknown ? 'Unknown (no birth time)' : chart.ascendant.sign,
    illumination: String(illumination),
    phase_name: phaseName,
  }

  return <FullMoonContent cycleKey={cycleKey} context={context} isPremium={isPremium} illumination={illumination} phaseName={phaseName} />
}

function FullMoonContent({
  cycleKey, context, isPremium, illumination, phaseName,
}: {
  cycleKey: string
  context: MoonReadingContext
  isPremium: boolean
  illumination: number
  phaseName: string
}) {
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')

  async function load(unlock = false) {
    setError('')
    if (unlock) setLoading(true)
    try {
      const res = await getMoonReading({ cycleKey, context, unlock })
      if (res.body) { setBody(res.body); setLocked(false) }
      else if (res.locked) setLocked(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your reading.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(false) }, [cycleKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full bg-gradient-to-br from-cosmos-800/90 to-cosmos-900 border border-stardust-400/30 rounded-2xl px-5 py-4 mb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] uppercase tracking-widest text-stardust-400">Full Moon</p>
        <span className="text-base">🌕</span>
      </div>
      <h2 className="text-slate-100 font-display text-lg mb-0.5">Your Full Moon Reading</h2>
      <p className="text-stardust-300/70 text-xs mb-3">
        {phaseName} · {illumination}% illuminated · {cycleKey.replace('-', ' / ')}
      </p>

      {body ? (
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{body}</p>
      ) : loading ? (
        <p className="text-slate-500 text-xs">Calculating…</p>
      ) : locked ? (
        <>
          <p className="text-slate-400 text-sm mb-4">
            A personalized ~500-word reading for this full moon — what it illuminates for your
            natal Moon in {context.moon_sign}, what to release, what to receive, and a ritual for the night.
          </p>
          <button
            onClick={() => void load(true)}
            disabled={loading}
            className="rounded-full px-5 py-2 bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-semibold disabled:opacity-60"
          >
            {isPremium ? 'Read your Full Moon (free on Premium)' : `Unlock · ${COST} credits`}
          </button>
          {!isPremium && (
            <p className="text-[10px] text-slate-600 mt-2">
              Once per month · about $1.00 in credits · free on{' '}
              <Link to="/upgrade" className="underline">Premium</Link>
            </p>
          )}
        </>
      ) : null}

      {error && (
        <p className="text-rose-400 text-xs mt-2">
          {error}{' '}
          {error.includes('credit') && <Link to="/upgrade" className="underline">Get credits</Link>}
        </p>
      )}
    </div>
  )
}
