/**
 * TodayCard — personalized daily horoscope on the home page.
 *
 * The day's mood comes from lib/dayQuality, in the SAME system as the user's
 * chosen reading (Western Sun-sign or Vedic Moon), so the mood and the
 * horoscope under it rest on one source. The prose reading is HoroscopeSection:
 * the user's default lens is free daily, others cost credits.
 *
 * It leads with one plain sentence; the technical layer sits behind "Why?" so
 * a newcomer isn't met with jargon. The Vedic detail (nakshatra, tithi, vara,
 * transits) shows only when the mood is Vedic — it would explain the wrong
 * system otherwise.
 */

import { useMemo, useState } from 'react'
import { useUser } from '@/store/UserContext'
import { defaultHoroscopeLens, getDayQuality, lensSystem } from '@/lib/dayQuality'
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

// `plain` describes the day's feel, not advice: the reading under it is generated
// per sign, so even in the same system its wording can lean differently.
const QUALITY_COPY = {
  favorable: { tone: 'text-emerald-300', label: 'Flowing day', plain: 'A supportive day — things tend to come together more easily.' },
  neutral: { tone: 'text-slate-300', label: 'Steady day', plain: 'An even day — good for steady, ordinary progress.' },
  challenging: { tone: 'text-rose-300', label: 'Tender day', plain: 'A sensitive day — go gently and give yourself room.' },
} as const

// The strongest caution in each system — Vedic chandrashtama (Moon 8th from natal
// Moon) or the Western Moon opposite the Sun sign — said plainly.
const REST_DAY_PLAIN = 'Your monthly rest day — keep plans light and avoid big decisions.'

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
  const { profile } = useUser()
  const system = lensSystem(defaultHoroscopeLens(profile))
  const day = useMemo(() => getDayQuality(chart, system), [chart, system])

  // Vedic factual layer — feeds the personalized lens prompt (always Vedic) and the
  // Vedic "Why?" detail.
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

  const q = QUALITY_COPY[day.quality]
  const plain = day.restDay ? REST_DAY_PLAIN : q.plain
  const [showWhy, setShowWhy] = useState(false)

  return (
    <div className="w-full bg-cosmos-900 border border-cosmos-700 rounded-2xl px-5 py-4 mb-3 text-left">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-widest text-stardust-400">Today for you</p>
        <p className={`text-xs font-medium ${q.tone}`}>{q.label}</p>
      </div>

      {/* Plain language first */}
      <p className="text-slate-100 text-base leading-snug">{plain}</p>
      <p className="text-slate-500 text-xs mt-1.5">
        {today.panchanga.moonPhase.emoji} Moon in {day.transitMoonSign}
        {' · '}
        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          aria-expanded={showWhy}
          className="text-stardust-300 hover:text-stardust-200 underline underline-offset-2"
        >
          {showWhy ? 'Hide the astrology' : 'Why?'}
        </button>
      </p>

      {/* The technical layer, on request */}
      {showWhy && (
        <div className="mt-2 rounded-xl bg-cosmos-800/50 border border-cosmos-700 px-3 py-2">
          <p className="text-slate-300 text-sm leading-relaxed">{day.basis}</p>
          {system === 'vedic' && (
          <>
          <p className="text-slate-300 text-sm mt-2">
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
          </>
          )}
        </div>
      )}

      <HoroscopeSection chart={chart} transitSummary={transitSummary} />
    </div>
  )
}
