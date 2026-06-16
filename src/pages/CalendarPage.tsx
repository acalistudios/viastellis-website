/**
 * Astrological Calendar — Task 7
 *
 * Month grid colored by classical Moon gochara (transit Moon's house counted
 * from the user's natal Moon sign). Selecting a day shows the full transit
 * snapshot for that date.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNatalChart } from '@/hooks/useNatalChart'
import {
  getTransitSnapshot,
  moonSiderealDeg,
  moonGocharaQuality,
  signFromDeg,
  type GocharaQuality,
} from '@/lib/ephemeris'
import { scoreUpcomingDays, bestDays } from '@/lib/muhurta'
import { getPanchanga, upcomingEclipses } from '@/lib/panchanga'
import { InfoBubble } from '@/components/ui/InfoBubble'
import { WeekAheadCard } from '@/components/calendar/WeekAheadCard'
import { useUser } from '@/store/UserContext'
import { streamStella } from '@/lib/gemini'
import { upcomingRetrogrades } from '@/lib/retrograde'
import { getGemstoneRecommendations } from '@/lib/gemstones'
import { Button } from '@/components/ui/Button'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'
import type { ZodiacSign } from '@/types'

interface GoalTag {
  id: string
  text: string
  bestDates: Date[]
  category: 'launch' | 'healing' | 'romance' | 'health' | 'financial' | 'other'
}

const SIGN_GLYPHS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
}

const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Rahu: '☊', Ketu: '☋',
}

const QUALITY_STYLES: Record<GocharaQuality, string> = {
  favorable: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/20',
  neutral: 'bg-cosmos-800 text-slate-400 border-cosmos-700',
  challenging: 'bg-rose-400/10 text-rose-300/80 border-rose-400/20',
}

const QUALITY_LABELS: Record<GocharaQuality, { label: string; blurb: string }> = {
  favorable: { label: 'Flowing day', blurb: 'The Moon moves through supportive territory for you.' },
  neutral: { label: 'Steady day', blurb: 'A balanced, in-between sky. Good for routine.' },
  challenging: { label: 'Tender day', blurb: 'The Moon transits a sensitive zone — go gently.' },
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface DayInfo {
  date: Date
  day: number
  moonSign: ZodiacSign
  quality: GocharaQuality
  isChandrashtama: boolean
  isToday: boolean
}

function buildMonth(year: number, month: number, natalMoonSign: ZodiacSign): DayInfo[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const days: DayInfo[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    // Sample the Moon at local noon — representative for the civil day
    const date = new Date(year, month, d, 12, 0, 0)
    const moonSign = signFromDeg(moonSiderealDeg(date)) as ZodiacSign
    const g = moonGocharaQuality(natalMoonSign, moonSign)
    days.push({
      date,
      day: d,
      moonSign,
      quality: g.quality,
      isChandrashtama: g.isChandrashtama,
      isToday:
        d === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
    })
  }
  return days
}

export function CalendarPage() {
  const { session } = useUser()
  const { chart, loading } = useNatalChart()
  const now = new Date()
  const [dayReading, setDayReading] = useState('')
  const [dayStreaming, setDayStreaming] = useState(false)
  const [dayError, setDayError] = useState('')
  const [goalText, setGoalText] = useState('')
  const [goals, setGoals] = useState<GoalTag[]>([])
  const [showGoalSection, setShowGoalSection] = useState(false)
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<Date>(now)

  const natalMoonSign = chart?.planets.find(p => p.planet === 'Moon')?.sign ?? null

  // Top upcoming days (muhurta: tarabala + gochara over the next 30 days)
  const SIGNS_LIST = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
  const topDays = useMemo(() => {
    const moon = chart?.planets.find(p => p.planet === 'Moon')
    if (!moon) return []
    const natalMoonDeg = SIGNS_LIST.indexOf(moon.sign) * 30 + moon.degree
    return bestDays(scoreUpcomingDays(natalMoonDeg, 30), 5)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart])

  const days = useMemo(
    () => (natalMoonSign ? buildMonth(viewYear, viewMonth, natalMoonSign) : []),
    [viewYear, viewMonth, natalMoonSign]
  )

  const selectedTransits = useMemo(
    () => getTransitSnapshot(new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 12)),
    [selected]
  )

  // Reset the AI day-reading whenever a different day is selected
  useEffect(() => { setDayReading(''); setDayError('') }, [selected])

  const selectedPanchanga = useMemo(
    () => getPanchanga(new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 12)),
    [selected]
  )

  const eclipses = useMemo(() => upcomingEclipses(new Date(), 14).slice(0, 4), [])

  const selectedInfo = useMemo(() => {
    if (!natalMoonSign) return null
    const moonSign = signFromDeg(
      moonSiderealDeg(new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 12))
    ) as ZodiacSign
    return { moonSign, ...moonGocharaQuality(natalMoonSign, moonSign) }
  }, [selected, natalMoonSign])

  async function askAboutDay() {
    if (!session || !selectedInfo || dayStreaming) return
    setDayError('')
    setDayReading('')
    setDayStreaming(true)
    try {
      const transitLine = selectedTransits
        .map(t => `${t.planet} ${t.sign}${t.retrograde ? '(R)' : ''}`)
        .join(', ')
      const prompt =
        `Explain this day (~90 words) for someone with natal Moon in ${natalMoonSign}: ` +
        `${selected.toDateString()}. Moon transits ${selectedInfo.moonSign} ` +
        `(${selectedInfo.houseFromMoon}th from their Moon, ${selectedInfo.quality}` +
        `${selectedInfo.isChandrashtama ? ', chandrashtama' : ''}). ` +
        `Panchanga: ${selectedPanchanga.tithi.name} tithi (${selectedPanchanga.tithi.paksha}), ` +
        `${selectedPanchanga.vara.name}, ${selectedPanchanga.yoga.name} yoga. ` +
        `Sky: ${transitLine}. What kind of day is this for them? Flowing prose, warm, no headings.`

      let acc = ''
      for await (const chunk of streamStella(prompt, { persona: 'warm' }, session.access_token)) {
        acc += chunk
        setDayReading(acc)
      }
    } catch (err: unknown) {
      setDayError(err instanceof Error ? err.message : "Stella couldn't read this day.")
    } finally {
      setDayStreaming(false)
    }
  }

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  function addGoal() {
    if (!goalText.trim() || !chart) return

    // Score next 30 days and find best 3 for this goal
    const moon = chart.planets.find(p => p.planet === 'Moon')
    if (!moon) return

    const SIGNS_LIST = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
    const natalMoonDeg = SIGNS_LIST.indexOf(moon.sign) * 30 + moon.degree
    const scored = scoreUpcomingDays(natalMoonDeg, 30)
    const top3 = bestDays(scored, 3).map(d => d.date)

    const goal: GoalTag = {
      id: Math.random().toString(),
      text: goalText.trim(),
      bestDates: top3,
      category: 'launch',
    }

    setGoals([...goals, goal])
    setGoalText('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full py-24">
        <span className="w-8 h-8 rounded-full border-2 border-stardust-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!natalMoonSign) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-slate-400 text-sm">Complete your birth chart to see your personal calendar.</p>
      </div>
    )
  }

  // Offset for the first weekday of the month
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()

  return (
    <div className="px-5 py-8 max-w-lg mx-auto">
      <h1 className="font-display text-3xl text-stardust-300 text-center mb-1">Your Sky Calendar</h1>
      <p className="text-slate-500 text-xs text-center mb-6">
        Personalized to your natal Moon in {SIGN_GLYPHS[natalMoonSign]} {natalMoonSign}
      </p>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => shiftMonth(-1)}
          className="w-9 h-9 rounded-full bg-cosmos-800 text-slate-400 hover:text-slate-100 transition-colors"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="text-slate-200 font-medium">{MONTH_NAMES[viewMonth]} {viewYear}</p>
        <button
          onClick={() => shiftMonth(1)}
          className="w-9 h-9 rounded-full bg-cosmos-800 text-slate-400 hover:text-slate-100 transition-colors"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAYS.map(w => (
          <span key={w} className="text-center text-[10px] text-slate-600 uppercase tracking-wide">{w}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1.5 mb-6">
        {Array.from({ length: firstWeekday }).map((_, i) => <span key={`pad-${i}`} />)}
        {days.map(d => {
          const isSelected =
            d.date.toDateString() === selected.toDateString()
          return (
            <button
              key={d.day}
              onClick={() => setSelected(d.date)}
              className={[
                'aspect-square rounded-xl border text-sm flex flex-col items-center justify-center gap-0.5 transition-all',
                QUALITY_STYLES[d.quality],
                isSelected && 'ring-2 ring-stardust-400',
                d.isToday && !isSelected && 'ring-1 ring-stardust-400/50',
              ].filter(Boolean).join(' ')}
            >
              <span className={d.isToday ? 'font-bold' : ''}>{d.day}</span>
              <span className="text-[9px] opacity-70">{SIGN_GLYPHS[d.moonSign]}</span>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mb-6 text-[11px]">
        <span className="flex items-center gap-1.5 text-emerald-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/40" /> Flowing
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-cosmos-700" /> Steady
        </span>
        <span className="flex items-center gap-1.5 text-rose-300/80">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400/30" /> Tender
        </span>
      </div>

      {/* Selected day detail */}
      {selectedInfo && (
        <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl p-5 mb-6">
          <p className="text-slate-200 font-medium mb-1">
            {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-sm mb-1">
            <span className={
              selectedInfo.quality === 'favorable' ? 'text-emerald-300'
                : selectedInfo.quality === 'challenging' ? 'text-rose-300'
                : 'text-slate-300'
            }>
              {QUALITY_LABELS[selectedInfo.quality].label}
            </span>
            <span className="text-slate-500">
              {' '}· Moon in {selectedInfo.moonSign} ({selectedInfo.houseFromMoon}
              {selectedInfo.houseFromMoon === 1 ? 'st' : selectedInfo.houseFromMoon === 2 ? 'nd' : selectedInfo.houseFromMoon === 3 ? 'rd' : 'th'} from your Moon)
            </span>
          </p>
          <p className="text-slate-500 text-xs mb-4">
            {selectedInfo.isChandrashtama
              ? 'Chandrashtama — the classical rest-and-reflect day of the month. Keep plans light.'
              : QUALITY_LABELS[selectedInfo.quality].blurb}
          </p>

          {/* Panchanga */}
          <p className="text-[11px] uppercase tracking-widest text-slate-600 mb-2">
            Panchanga{' '}
            <InfoBubble title="Panchanga" align="left">
              The five "limbs" of the Vedic day: tithi (lunar day), vara (weekday + its planetary
              lord), nakshatra (Moon's mansion), yoga (Sun–Moon combination), and karana
              (half-tithi). Together they describe each day's traditional quality.
            </InfoBubble>
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-4 text-xs text-slate-400">
            <span>{selectedPanchanga.moonPhase.emoji} {selectedPanchanga.moonPhase.name} · {selectedPanchanga.moonPhase.illumination}%</span>
            <span>Tithi: {selectedPanchanga.tithi.name} ({selectedPanchanga.tithi.paksha})</span>
            <span>Vara: {selectedPanchanga.vara.name} ({selectedPanchanga.vara.lord})</span>
            <span>Yoga: {selectedPanchanga.yoga.name}</span>
            <span>Karana: {selectedPanchanga.karana.name}</span>
          </div>

          {/* Transit snapshot */}
          <p className="text-[11px] uppercase tracking-widest text-slate-600 mb-2">Sky on this day</p>
          <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
            {selectedTransits.map(t => (
              <span key={t.planet} className="text-xs text-slate-400">
                <span className="text-stardust-400">{PLANET_GLYPHS[t.planet]}</span>{' '}
                {t.sign.slice(0, 3)} {Math.floor(t.degree)}°
                {t.retrograde && <span className="text-stellar-400">℞</span>}
              </span>
            ))}
          </div>

          {/* Ask Stella about this day */}
          {dayReading ? (
            <p className="text-slate-300 text-sm leading-relaxed mt-4 pt-4 border-t border-cosmos-800 whitespace-pre-wrap">
              {dayReading}
              {dayStreaming && <span className="inline-block w-2 h-4 ml-0.5 bg-stardust-400 animate-pulse align-text-bottom rounded-sm" />}
            </p>
          ) : (
            <button
              onClick={() => void askAboutDay()}
              disabled={dayStreaming}
              className="mt-4 text-xs text-stardust-400 hover:text-stardust-300 transition-colors disabled:opacity-50"
            >
              {dayStreaming ? 'Stella is reading this day…' : '✨ Ask Stella about this day'}
            </button>
          )}
          {dayError && <p className="text-rose-400 text-xs mt-2">{dayError}</p>}
        </div>
      )}

      {/* Weekly forecast */}
      {chart && <WeekAheadCard chart={chart} />}

      {/* Goal tagging */}
      <div className="mb-6">
        <button
          onClick={() => setShowGoalSection(!showGoalSection)}
          className="text-sm text-slate-400 font-medium mb-3 px-1 hover:text-stardust-300 transition-colors"
        >
          {showGoalSection ? '▼' : '▶'} Tag an intention
          <InfoBubble title="Goal tagging" align="right">
            Tell us what you want to do ("launch business", "healing work", "romance"), and we'll find the 3 best days in the next month for it.
          </InfoBubble>
        </button>

        {showGoalSection && (
          <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl px-4 py-3 mb-4 space-y-3">
            <input
              type="text"
              placeholder="e.g., 'launch my business', 'start healing'"
              value={goalText}
              onChange={e => setGoalText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addGoal()}
              className="w-full bg-[#0a0e27]/60 border border-stardust-400/20 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-stardust-400/60"
            />
            <Button size="sm" onClick={() => addGoal()} disabled={!goalText.trim()}>
              Find best dates
            </Button>
          </div>
        )}

        {goals.length > 0 && (
          <div className="space-y-2 mb-6">
            {goals.map(goal => (
              <div key={goal.id} className="bg-cosmos-900 border border-cosmos-700 rounded-xl px-4 py-3">
                <p className="text-slate-200 text-sm font-medium mb-2">{goal.text}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {goal.bestDates.map(d => (
                    <button
                      key={d.getTime()}
                      onClick={() => {
                        setViewYear(d.getFullYear())
                        setViewMonth(d.getMonth())
                        setSelected(d)
                      }}
                      className="text-xs bg-stardust-400/10 hover:bg-stardust-400/20 border border-stardust-400/40 text-stardust-300 rounded-full px-2 py-1 transition-colors"
                    >
                      {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Retrograde alerts & gemstones */}
      {chart && (
        <div className="mb-6 space-y-4">
          {/* Retrograde alerts */}
          {upcomingRetrogrades(now, 12).length > 0 && (
            <div>
              <p className="text-sm text-slate-400 font-medium mb-2 px-1">
                ♄ Upcoming retrogrades
              </p>
              <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl overflow-hidden text-xs">
                {upcomingRetrogrades(now, 12).slice(0, 3).map((r, i) => (
                  <div key={i} className="px-4 py-2.5 border-b border-cosmos-800 last:border-0">
                    <p className="text-slate-300">
                      {r.planet} retrograde in {Math.ceil(r.startsIn)} days ({r.durationDays} days)
                    </p>
                    <p className="text-slate-600 text-[10px] mt-0.5">{r.meaning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gemstone recommendations */}
          {getGemstoneRecommendations(chart).length > 0 && (
            <div>
              <p className="text-sm text-slate-400 font-medium mb-2 px-1">
                💎 Gemstones to strengthen your chart
              </p>
              <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl overflow-hidden">
                {getGemstoneRecommendations(chart).map(rec => (
                  <div key={rec.planet} className="px-4 py-3 border-b border-cosmos-800 last:border-0">
                    <p className="text-slate-200 text-sm font-medium">{rec.gem}</p>
                    <p className="text-slate-500 text-[11px] mt-1">{rec.reason}</p>
                    <p className="text-stardust-300 text-[10px] mt-2">{rec.benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Muhurta: best upcoming days */}
      {topDays.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm text-slate-400 font-medium mb-3 px-1">
            Your best days ahead{' '}
            <InfoBubble title="How days are picked" align="left">
              Each of the next 30 days is scored with two classical systems: Tarabala (counting
              from your birth nakshatra to the day's lunar nakshatra) and Moon gochara (the
              transiting Moon's position from your natal Moon). Higher = smoother sky for you.
            </InfoBubble>
          </h2>
          <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl overflow-hidden">
            {topDays.map((d, i) => (
              <button
                key={i}
                onClick={() => {
                  setViewYear(d.date.getFullYear())
                  setViewMonth(d.date.getMonth())
                  setSelected(d.date)
                }}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-cosmos-800 last:border-0 hover:bg-cosmos-800/50 transition-colors text-left"
              >
                <div>
                  <p className="text-slate-200 text-sm">
                    {d.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    {d.tara.name} tara — {d.tara.meaning}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-stardust-300 font-display text-lg leading-none">{d.score}</p>
                  <p className="text-slate-600 text-[10px] mt-0.5">/100</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming eclipses */}
      {eclipses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm text-slate-400 font-medium mb-3 px-1">
            Upcoming eclipses{' '}
            <InfoBubble title="Eclipses" align="left">
              Eclipses occur when a new or full Moon falls near Rahu/Ketu (the lunar nodes).
              Vedic tradition treats eclipse days as time for rest and reflection rather than
              new beginnings.
            </InfoBubble>
          </h2>
          <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl overflow-hidden">
            {eclipses.map((e, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-cosmos-800 last:border-0">
                <span className="text-slate-300 text-sm">
                  {e.kind === 'solar' ? '☀️' : '🌙'} {e.type} {e.kind} eclipse
                </span>
                <span className="text-slate-500 text-xs tabular-nums">
                  {e.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-600 text-center max-w-xs mx-auto">{ENTERTAINMENT_DISCLAIMER}</p>
    </div>
  )
}
