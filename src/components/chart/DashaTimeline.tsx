/**
 * DashaTimeline — Vimshottari mahadasha/antardasha view for the Chart page.
 * Current period hero card + expandable 120-year timeline.
 */

import { useMemo, useState } from 'react'
import { birthDataToJde } from '@/lib/ephemeris'
import {
  calculateVimshottari,
  getAntardashas,
  findCurrentDasha,
  type DashaLord,
} from '@/lib/dasha'
import { InfoBubble } from '@/components/ui/InfoBubble'
import type { NatalChart } from '@/types'

const LORD_GLYPHS: Record<DashaLord, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Rahu: '☊', Ketu: '☋',
}

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

function fmt(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function DashaTimeline({ chart }: { chart: NatalChart }) {
  const [expanded, setExpanded] = useState<number | null>(null)

  const data = useMemo(() => {
    const moon = chart.planets.find(p => p.planet === 'Moon')!
    const moonDeg = SIGNS.indexOf(moon.sign) * 30 + moon.degree

    const jde = birthDataToJde(
      chart.birth_data.date,
      chart.birth_data.time_unknown ? null : chart.birth_data.time,
      chart.birth_data.timezone
    )
    const birthInstant = new Date((jde - 2440587.5) * 86400000)

    const mahadashas = calculateVimshottari(moonDeg, birthInstant)
    const current = findCurrentDasha(mahadashas)
    return { mahadashas, current }
  }, [chart])

  const { mahadashas, current } = data
  const [now] = useState(() => Date.now())

  return (
    <div className="mt-6">
      <h2 className="text-sm text-slate-400 font-medium mb-3 px-1">
        Dasha Periods (Vimshottari){' '}
        <InfoBubble title="Vimshottari Dasha" align="left">
          The signature timing system of Vedic astrology: life unfolds in a fixed 120-year wheel
          of planetary "rulerships," set by your Moon's nakshatra at birth. Each mahadasha (major
          period) is subdivided into antardashas. The ruling planet's themes are said to color
          that chapter of life.
        </InfoBubble>
      </h2>

      {/* Current period hero */}
      {current && (
        <div className="bg-cosmos-800 border border-stardust-400/30 rounded-2xl px-5 py-4 mb-3">
          <p className="text-[11px] uppercase tracking-widest text-stardust-400 mb-1.5">Right now</p>
          <p className="text-slate-100 text-lg font-display">
            {LORD_GLYPHS[current.maha.lord]} {current.maha.lord} mahadasha
            <span className="text-slate-500 text-sm font-sans">
              {' '}· {LORD_GLYPHS[current.antar.lord]} {current.antar.lord} antardasha
            </span>
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {current.maha.lord} period runs until {fmt(current.maha.end)} ·{' '}
            {current.antar.lord} sub-period until {fmt(current.antar.end)}
          </p>
          {/* Progress through the mahadasha */}
          <div className="h-1.5 bg-cosmos-900 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-stardust-400 rounded-full"
              style={{
                width: `${Math.round(
                  ((now - current.maha.start.getTime()) /
                    (current.maha.end.getTime() - current.maha.start.getTime())) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl overflow-hidden">
        {mahadashas.map((m, i) => {
          const isCurrent = current?.maha === m
          const isPast = m.end.getTime() < now
          const isOpen = expanded === i
          return (
            <div key={i} className="border-b border-cosmos-800 last:border-0">
              <button
                onClick={() => setExpanded(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-cosmos-800/50 transition-colors"
              >
                <span className={[
                  'text-sm',
                  isCurrent ? 'text-stardust-300 font-semibold' : isPast ? 'text-slate-600' : 'text-slate-300',
                ].join(' ')}>
                  <span className="mr-1.5">{LORD_GLYPHS[m.lord]}</span>
                  {m.lord}
                  {isCurrent && <span className="text-[10px] ml-2 bg-stardust-400/20 text-stardust-300 px-2 py-0.5 rounded-full align-middle">now</span>}
                </span>
                <span className={`text-xs tabular-nums ${isPast ? 'text-slate-700' : 'text-slate-500'}`}>
                  {fmt(m.start)} – {fmt(m.end)}
                  <span className="ml-2 text-slate-600">{isOpen ? '▾' : '▸'}</span>
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-3 flex flex-col gap-1">
                  {getAntardashas(m).map((a, j) => {
                    const antarCurrent = current?.antar.start.getTime() === a.start.getTime()
                      && current?.maha === m
                    return (
                      <div
                        key={j}
                        className={[
                          'flex items-center justify-between text-xs rounded-lg px-3 py-1.5',
                          antarCurrent ? 'bg-stardust-400/10 text-stardust-300' : 'text-slate-500',
                        ].join(' ')}
                      >
                        <span>{LORD_GLYPHS[a.lord]} {a.lord}</span>
                        <span className="tabular-nums">{fmt(a.start)} – {fmt(a.end)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {chart.birth_data.time_unknown && (
        <p className="text-[11px] text-amber-400/80 mt-2 px-1">
          Without a birth time, dasha boundaries can shift by up to ~½ day's Moon motion — dates
          near period changes are approximate.
        </p>
      )}
    </div>
  )
}
