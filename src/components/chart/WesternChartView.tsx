/**
 * WesternChartView — the full tropical (Western) chart.
 *
 * Rendered by ChartPage when the user's chart_system preference is 'western'.
 * Shows tropical planet positions (incl. Uranus/Neptune/Pluto), Placidus house
 * cusps, and the aspect grid. No nakshatras/dashas (those are Vedic-only).
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { calculateWesternChart } from '@/lib/westernChart'
import { InfoBubble } from '@/components/ui/InfoBubble'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'
import type { BirthData, WesternBody, AspectType } from '@/types'

const SIGN_GLYPHS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
}

const BODY_GLYPHS: Record<WesternBody, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  'North Node': '☊', 'South Node': '☋', Ascendant: 'Asc', Midheaven: 'MC',
}

const ASPECT_META: Record<AspectType, { glyph: string; klass: string; label: string }> = {
  conjunction: { glyph: '☌', klass: 'text-slate-300', label: 'Conjunction' },
  sextile: { glyph: '⚹', klass: 'text-emerald-300', label: 'Sextile' },
  square: { glyph: '□', klass: 'text-rose-300', label: 'Square' },
  trine: { glyph: '△', klass: 'text-emerald-300', label: 'Trine' },
  opposition: { glyph: '☍', klass: 'text-amber-300', label: 'Opposition' },
}

function fmtDeg(deg: number): string {
  const d = Math.floor(deg)
  const m = Math.round((deg - d) * 60)
  return `${d}°${String(m).padStart(2, '0')}′`
}

export function WesternChartView({ birthData }: { birthData: BirthData }) {
  const chart = useMemo(() => calculateWesternChart(birthData), [birthData])
  const timeUnknown = birthData.time_unknown

  const houseSystemLabel =
    chart.house_system === 'placidus' ? 'Placidus'
      : chart.house_system === 'equal' ? 'Equal (high latitude)'
      : 'Whole Sign (no birth time)'

  return (
    <div className="px-5 py-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="font-display text-3xl text-stardust-300">Your Western Chart</h1>
        <p className="text-slate-500 text-sm mt-1">
          {birthData.name} · {birthData.date}
          {!timeUnknown && ` · ${birthData.time}`}
        </p>
        <p className="text-slate-600 text-xs mt-0.5">
          {birthData.city}, {birthData.country} · Tropical{' '}
          <InfoBubble title="Tropical zodiac">
            Western astrology anchors 0° Aries to the spring equinox. Because the equinox slowly
            drifts against the stars, your Western signs sit ~24° apart from your Vedic ones.{' '}
            <Link to="/zodiac-systems" className="text-stardust-400 underline">Why your signs differ →</Link>
          </InfoBubble>
          {' '}· {houseSystemLabel}{' '}
          <InfoBubble title="Placidus houses" align="right">
            The most common Western house system. House cusps are based on the time it takes each
            degree of the ecliptic to rise, so houses are unequal in size.
          </InfoBubble>
        </p>
      </div>

      {/* Ascendant / Midheaven summary */}
      {!timeUnknown && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl px-4 py-3 text-center">
            <p className="text-[11px] uppercase tracking-widest text-slate-500">Ascendant</p>
            <p className="text-slate-100 text-lg font-display mt-0.5">
              {SIGN_GLYPHS[chart.ascendant.sign]} {chart.ascendant.sign}
            </p>
            <p className="text-slate-500 text-xs">{fmtDeg(chart.ascendant.degree)}</p>
          </div>
          <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl px-4 py-3 text-center">
            <p className="text-[11px] uppercase tracking-widest text-slate-500">Midheaven</p>
            <p className="text-slate-100 text-lg font-display mt-0.5">
              {SIGN_GLYPHS[chart.midheaven.sign]} {chart.midheaven.sign}
            </p>
            <p className="text-slate-500 text-xs">{fmtDeg(chart.midheaven.degree)}</p>
          </div>
        </div>
      )}
      {timeUnknown && (
        <p className="text-amber-300/80 text-xs text-center mb-5 bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-2">
          No birth time on file — houses, Ascendant, and Midheaven need a birth time. Showing sign
          positions only.
        </p>
      )}

      {/* Planet table */}
      <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl overflow-hidden mb-6">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2 border-b border-cosmos-800 text-[10px] uppercase tracking-wider text-slate-500">
          <span>Planet</span>
          <span className="text-right">Sign · Degree</span>
          <span className="text-right pl-3">{timeUnknown ? '' : 'House'}</span>
        </div>
        {chart.planets.map((p) => (
          <div key={p.body} className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2.5 border-b border-cosmos-800/60 last:border-0 items-center">
            <span className="text-slate-200 text-sm flex items-center gap-2">
              <span className="text-stardust-300 w-5 text-center">{BODY_GLYPHS[p.body]}</span>
              {p.body}
              {p.retrograde && p.body !== 'North Node' && p.body !== 'South Node' && (
                <span className="text-rose-300 text-[10px]" title="Retrograde">℞</span>
              )}
            </span>
            <span className="text-right text-slate-300 text-sm">
              {SIGN_GLYPHS[p.sign]} {p.sign} <span className="text-slate-500">{fmtDeg(p.degree)}</span>
            </span>
            <span className="text-right text-slate-400 text-sm pl-3 w-8">
              {timeUnknown ? '' : p.house}
            </span>
          </div>
        ))}
      </div>

      {/* Houses */}
      {!timeUnknown && (
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-2 px-1">House Cusps</p>
          <div className="grid grid-cols-2 gap-2">
            {chart.houses.map((h) => (
              <div key={h.house} className="bg-cosmos-900 border border-cosmos-700 rounded-xl px-3 py-2 flex items-center justify-between">
                <span className="text-slate-500 text-xs">House {h.house}</span>
                <span className="text-slate-200 text-sm">
                  {SIGN_GLYPHS[h.sign]} <span className="text-slate-400">{fmtDeg(h.degree)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aspects */}
      {chart.aspects.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-2 px-1">
            Aspects <span className="text-slate-600">· {chart.aspects.length}</span>
          </p>
          <div className="flex flex-col gap-1.5">
            {chart.aspects.map((a, i) => {
              const m = ASPECT_META[a.type]
              return (
                <div key={i} className="bg-cosmos-900 border border-cosmos-700 rounded-xl px-4 py-2 flex items-center gap-2 text-sm">
                  <span className="text-stardust-300 w-5 text-center">{BODY_GLYPHS[a.a]}</span>
                  <span className={`${m.klass} w-5 text-center`} title={m.label}>{m.glyph}</span>
                  <span className="text-stardust-300 w-5 text-center">{BODY_GLYPHS[a.b]}</span>
                  <span className="text-slate-400 text-xs ml-1">{m.label}</span>
                  <span className="text-slate-600 text-xs ml-auto">
                    {a.orb.toFixed(1)}° {a.applying ? 'applying' : 'separating'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="mt-8 text-[11px] text-slate-600 text-center max-w-xs mx-auto">{ENTERTAINMENT_DISCLAIMER}</p>
    </div>
  )
}
