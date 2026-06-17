/**
 * TodayCard — personalized daily horoscope on the home page.
 *
 * The factual layer is deterministic (today's Moon gochara vs natal Moon,
 * notable transits touching natal positions). Stella's prose reading is
 * generated on demand — one credit, cached for the day in sessionStorage.
 */

import { useMemo, useState } from 'react'
import { useUser } from '@/store/UserContext'
import {
  getTransitSnapshot,
  moonGocharaQuality,
  moonSiderealDeg,
  signFromDeg,
} from '@/lib/ephemeris'
import { getPanchanga } from '@/lib/panchanga'
import { streamStella } from '@/lib/gemini'
import { InfoBubble } from '../ui/InfoBubble'
import type { NatalChart, ZodiacSign } from '@/types'

const QUALITY_COPY = {
  favorable: { tone: 'text-emerald-300', label: 'Flowing day' },
  neutral: { tone: 'text-slate-300', label: 'Steady day' },
  challenging: { tone: 'text-rose-300', label: 'Tender day' },
} as const

const EXPLANATIONS = {
  moonPosition: 'The Moon travels through a new zodiac sign every 2-3 days. This sign colors your emotional mood and instinctive needs today.',
  houseFromMoon: 'This measures the Moon\'s distance from your natal Moon. Each position (1st–12th) brings different energy: 1st is renewal, 3rd is communicative, 6th is grounding work.',
  tithi: 'The lunar day (tithi) is a phase in the Moon\'s cycle. Bright half (Shukla) = growth energy; Dark half (Krishna) = introspection & transformation.',
  vara: 'The weekday, ruled by a planet. Saturday (Shanivara) is ruled by Saturn—discipline, slowness, karma. Avoid major launches; ideal for inner work.',
  activations: 'A transiting planet aligned with your natal planet\'s sign activates that life area. Sun on your Venus = focus on values & relationships. Mars on your Sun = courage & drive surge.',
} as const

interface Props {
  chart: NatalChart
}

export function TodayCard({ chart }: Props) {
  const { session } = useUser()
  const todayKey = new Date().toISOString().split('T')[0]
  const cacheKey = `stella-daily-${todayKey}`

  const [reading, setReading] = useState<string>(() => sessionStorage.getItem(cacheKey) ?? '')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')

  const today = useMemo(() => {
    const now = new Date()
    const transits = getTransitSnapshot(now)
    const transitMoonSign = signFromDeg(moonSiderealDeg(now)) as ZodiacSign
    const natalMoonSign = chart.planets.find(p => p.planet === 'Moon')!.sign
    const gochara = moonGocharaQuality(natalMoonSign, transitMoonSign)
    const transitMoon = transits.find(t => t.planet === 'Moon')!

    // Transiting planets sitting on natal positions (same sign) — the day's "activations"
    const natalSignOf = new Map(chart.planets.map(p => [p.planet, p.sign]))
    const activations = transits
      .filter(t => t.planet !== 'Moon')
      .flatMap(t => {
        const hits: string[] = []
        for (const [natalPlanet, natalSign] of natalSignOf) {
          if (natalPlanet === 'Ascendant') continue
          if (t.sign === natalSign) hits.push(`${t.planet} is moving through your natal ${natalPlanet}'s sign`)
        }
        return hits.slice(0, 1) // at most one mention per transiting planet
      })
      .slice(0, 2) // keep the card short

    const panchanga = getPanchanga(now)

    return { transits, transitMoonSign, natalMoonSign, gochara, transitMoon, activations, panchanga }
  }, [chart])

  async function fetchReading() {
    if (!session || streaming) return
    setError('')
    setStreaming(true)
    try {
      const prompt =
        `Write today's personal daily reading (~80 words) for ${chart.birth_data.name}. ` +
        `Today the Moon transits ${today.transitMoonSign} (${today.transitMoon.nakshatra}), which is the ` +
        `${today.gochara.houseFromMoon}th sign from their natal Moon in ${today.natalMoonSign}` +
        `${today.gochara.isChandrashtama ? ' — chandrashtama, the monthly rest day' : ''}. ` +
        `Day quality: ${today.gochara.quality}. ` +
        (today.activations.length ? `Also: ${today.activations.join('; ')}. ` : '') +
        `Their natal Moon nakshatra: ${chart.planets.find(p => p.planet === 'Moon')?.nakshatra}. ` +
        `Flowing prose, warm, specific to these placements, no headings.`

      let text = ''
      for await (const chunk of streamStella(prompt, { persona: 'warm' }, session.access_token)) {
        text += chunk
        setReading(text)
      }
      sessionStorage.setItem(cacheKey, text)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Stella couldn't write today's reading.")
    } finally {
      setStreaming(false)
    }
  }

  const q = QUALITY_COPY[today.gochara.quality]

  return (
    <div className="w-full bg-cosmos-900 border border-cosmos-700 rounded-2xl px-5 py-4 mb-3 text-left">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-widest text-slate-500">Today for you</p>
        <p className={`text-xs font-medium ${q.tone}`}>{q.label}</p>
      </div>

      <p className="text-slate-300 text-sm">
        <span className="inline-flex items-center gap-1">
          {today.panchanga.moonPhase.emoji} Moon in {today.transitMoonSign} · {today.transitMoon.nakshatra}
          <InfoBubble title="Moon's sign today" align="left">{EXPLANATIONS.moonPosition}</InfoBubble>
        </span>
        {' '}·{' '}
        <span className="inline-flex items-center gap-1">
          {today.gochara.houseFromMoon}
          {today.gochara.houseFromMoon === 1 ? 'st' : today.gochara.houseFromMoon === 2 ? 'nd' : today.gochara.houseFromMoon === 3 ? 'rd' : 'th'}{' '}
          from your Moon
          <InfoBubble title="House from your Moon" align="right">{EXPLANATIONS.houseFromMoon}</InfoBubble>
        </span>
        {today.gochara.isChandrashtama && <span className="text-rose-300"> · chandrashtama (monthly rest day)</span>}
      </p>

      <p className="text-slate-500 text-xs mt-1">
        <span className="inline-flex items-center gap-1">
          {today.panchanga.tithi.name} tithi ({today.panchanga.tithi.paksha})
          <InfoBubble title="Tithi — lunar day" align="left">{EXPLANATIONS.tithi}</InfoBubble>
        </span>
        {' '}·{' '}
        <span className="inline-flex items-center gap-1">
          {today.panchanga.vara.name}
          <InfoBubble title="Vara — weekday" align="center">{EXPLANATIONS.vara}</InfoBubble>
        </span>
        {today.activations.length > 0 && (
          <>
            {' '}·{' '}
            <span className="inline-flex items-center gap-1">
              <span>{today.activations.join(' + ')}</span>
              <InfoBubble title="Transit activations" align="right">{EXPLANATIONS.activations}</InfoBubble>
            </span>
          </>
        )}
      </p>

      {reading ? (
        <p className="text-slate-300 text-sm leading-relaxed mt-3 pt-3 border-t border-cosmos-800 whitespace-pre-wrap">
          {reading}
          {streaming && (
            <span className="inline-block w-2 h-4 ml-0.5 bg-stardust-400 animate-pulse align-text-bottom rounded-sm" />
          )}
        </p>
      ) : (
        <button
          onClick={() => void fetchReading()}
          disabled={streaming}
          className="mt-3 text-xs text-stardust-400 hover:text-stardust-300 transition-colors disabled:opacity-50"
        >
          {streaming ? 'Stella is reading your sky…' : "✨ Get Stella's daily reading"}
        </button>
      )}

      {error && <p className="text-rose-400 text-xs mt-2">{error}</p>}
    </div>
  )
}
