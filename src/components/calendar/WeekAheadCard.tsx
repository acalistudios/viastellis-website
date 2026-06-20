/**
 * WeekAheadCard — feature #7. Stella's 7-day forecast, seeded with deterministic
 * gochara + tarabala data.
 *
 * Depends only on the natal Moon NAKSHATRA + the week's start date, so it's
 * generated once per (nakshatra, week) and SHARED across users via the
 * shared-reading function (cost saving). Still 1 credit per user; premium = free.
 * Cached locally for instant, charge-free re-views.
 */

import { useMemo, useState } from 'react'
import { useUser } from '@/store/UserContext'
import { moonSiderealDeg, moonGocharaQuality, signFromDeg } from '@/lib/ephemeris'
import { scoreUpcomingDays } from '@/lib/muhurta'
import { getSharedReading } from '@/lib/sharedReading'
import { CreditCost } from '@/components/ui/CreditCost'
import { CREDIT_COSTS } from '@/config/creditCosts'
import type { NatalChart, ZodiacSign } from '@/types'

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']

export function WeekAheadCard({ chart }: { chart: NatalChart }) {
  const { session } = useUser()
  const startKey = new Date().toISOString().split('T')[0]
  const localKey = `stella-week-${startKey}`
  const [text, setText] = useState(() => localStorage.getItem(localKey) ?? '')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')

  const week = useMemo(() => {
    const moon = chart.planets.find(p => p.planet === 'Moon')!
    const natalMoonDeg = SIGNS.indexOf(moon.sign) * 30 + moon.degree
    return scoreUpcomingDays(natalMoonDeg, 7)
  }, [chart])

  async function fetchForecast() {
    if (!session || streaming) return
    setError('')
    setStreaming(true)
    try {
      const moon = chart.planets.find(p => p.planet === 'Moon')!
      const natalMoonSign = moon.sign
      const daySummaries = week.map(d => {
        const transitMoonSign = signFromDeg(moonSiderealDeg(d.date)) as ZodiacSign
        const g = moonGocharaQuality(natalMoonSign, transitMoonSign)
        return `${d.date.toLocaleDateString('en-US', { weekday: 'short' })}: Moon ${transitMoonSign}/${d.nakshatra}, ${d.tara.name} tara, ${g.quality}${g.isChandrashtama ? ' (chandrashtama)' : ''}, score ${d.score}`
      }).join('; ')

      const res = await getSharedReading({
        kind: 'weekly',
        cacheKey: `${moon.nakshatra}|${startKey}`,
        unlock: true,
        data: { natalMoonSign, daySummaries },
      })
      if (res.body) {
        setText(res.body)
        localStorage.setItem(localKey, res.body)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Stella couldn't see the week ahead.")
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl px-5 py-4 mb-6">
      <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Your week ahead</p>
      {text ? (
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      ) : (
        <button
          onClick={() => void fetchForecast()}
          disabled={streaming}
          className="text-xs text-stardust-400 hover:text-stardust-300 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
        >
          {streaming ? 'Stella is reading the week…' : "✨ Get Stella's weekly forecast"}
          {!streaming && <CreditCost credits={CREDIT_COSTS.weekly} />}
        </button>
      )}
      {error && <p className="text-rose-400 text-xs mt-2">{error}</p>}
    </div>
  )
}
