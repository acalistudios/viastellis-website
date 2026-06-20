/**
 * TodayCard — personalized daily horoscope on the home page.
 *
 * The factual layer is deterministic (today's Moon gochara vs natal Moon,
 * notable transits touching natal positions). Stella's prose reading is
 * generated on demand — one credit, cached for the day in sessionStorage.
 */

import { useMemo } from 'react'
import {
  getTransitSnapshot,
  moonGocharaQuality,
  moonSiderealDeg,
  signFromDeg,
} from '@/lib/ephemeris'
import { getPanchanga } from '@/lib/panchanga'
import { HoroscopeSection } from './HoroscopeSection'
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

  const transitSummary =
    `Moon in ${today.transitMoonSign} (${today.transitMoon.nakshatra}), ` +
    `${today.gochara.houseFromMoon}th sign from natal Moon in ${today.natalMoonSign}, ` +
    `day quality ${today.gochara.quality}` +
    (today.activations.length ? `; ${today.activations.join('; ')}` : '') +
    (today.gochara.isChandrashtama ? '; chandrashtama (rest day)' : '')

  const q = QUALITY_COPY[today.gochara.quality]

  return (
    <div className="w-full bg-cosmos-900 border border-cosmos-700 rounded-2xl px-5 py-4 mb-3 text-left">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-widest text-stardust-400">Today for you</p>
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

      <HoroscopeSection chart={chart} transitSummary={transitSummary} />
    </div>
  )
}
