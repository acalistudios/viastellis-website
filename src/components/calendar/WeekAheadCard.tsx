/**
 * WeekAheadCard — feature #7. Stella's 7-day forecast, seeded with
 * deterministic gochara + tarabala data. Cached per ISO date in
 * sessionStorage so it costs one credit per day, not per visit.
 */

import { useMemo, useState } from 'react'
import { useUser } from '@/store/UserContext'
import { moonSiderealDeg, moonGocharaQuality, signFromDeg } from '@/lib/ephemeris'
import { scoreUpcomingDays } from '@/lib/muhurta'
import { streamStella } from '@/lib/gemini'
import type { NatalChart, ZodiacSign } from '@/types'

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']

export function WeekAheadCard({ chart }: { chart: NatalChart }) {
  const { session } = useUser()
  const cacheKey = `stella-week-${new Date().toISOString().split('T')[0]}`
  const [text, setText] = useState(() => sessionStorage.getItem(cacheKey) ?? '')
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
      const natalMoonSign = chart.planets.find(p => p.planet === 'Moon')!.sign
      const daySummaries = week.map(d => {
        const transitMoonSign = signFromDeg(moonSiderealDeg(d.date)) as ZodiacSign
        const g = moonGocharaQuality(natalMoonSign, transitMoonSign)
        return `${d.date.toLocaleDateString('en-US', { weekday: 'short' })}: Moon ${transitMoonSign}/${d.nakshatra}, ${d.tara.name} tara, ${g.quality}${g.isChandrashtama ? ' (chandrashtama)' : ''}, score ${d.score}`
      }).join('; ')

      const prompt =
        `Write a 7-day forecast (~130 words) for ${chart.birth_data.name} (natal Moon: ${natalMoonSign}). ` +
        `Day-by-day data: ${daySummaries}. ` +
        `Group the week into its arcs (don't list every day mechanically), name the best day and the day to keep light, ` +
        `and keep it warm and practical. Flowing prose, no headings.`

      let acc = ''
      for await (const chunk of streamStella(prompt, { persona: 'warm' }, session.access_token)) {
        acc += chunk
        setText(acc)
      }
      sessionStorage.setItem(cacheKey, acc)
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
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
          {text}
          {streaming && <span className="inline-block w-2 h-4 ml-0.5 bg-stardust-400 animate-pulse align-text-bottom rounded-sm" />}
        </p>
      ) : (
        <button
          onClick={() => void fetchForecast()}
          disabled={streaming}
          className="text-xs text-stardust-400 hover:text-stardust-300 transition-colors disabled:opacity-50"
        >
          {streaming ? 'Stella is reading the week…' : "✨ Get Stella's weekly forecast"}
        </button>
      )}
      {error && <p className="text-rose-400 text-xs mt-2">{error}</p>}
    </div>
  )
}
