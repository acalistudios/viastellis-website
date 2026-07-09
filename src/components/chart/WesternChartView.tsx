/**
 * WesternChartView — the full tropical (Western) chart.
 *
 * Rendered by ChartPage when the user's chart_system preference is 'western'.
 * Shows tropical planet positions (incl. Uranus/Neptune/Pluto), Placidus house
 * cusps, and the aspect grid. No nakshatras/dashas (those are Vedic-only).
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { calculateWesternChart } from '@/lib/westernChart'
import { signCuspFlag } from '@/lib/boundaryFlags'
import { streamStella } from '@/lib/gemini'
import { getReport } from '@/lib/report'
import { usePersonaBlock } from '@/hooks/usePersonaBlock'
import { creditLabel } from '@/config/creditCosts'
import { useUser } from '@/store/UserContext'
import { InfoBubble } from '@/components/ui/InfoBubble'
import { MarkdownText } from '@/components/ui/MarkdownText'
import { NumerologySection } from '@/components/chart/NumerologySection'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'
import type { BirthData, WesternBody, AspectType, WesternChart } from '@/types'

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

/** Format the aspects involving one body, e.g. "trine Mars (1.5°), square Saturn (4°)". */
function aspectsForBody(chart: WesternChart, body: WesternBody): string {
  const list = chart.aspects
    .filter((a) => a.a === body || a.b === body)
    .map((a) => `${a.type} ${a.a === body ? a.b : a.a} (${a.orb}°)`)
  return list.join(', ')
}

export function WesternChartView({ birthData }: { birthData: BirthData }) {
  const { session } = useUser()
  const chart = useMemo(() => calculateWesternChart(birthData), [birthData])
  const timeUnknown = birthData.time_unknown

  // Per-planet Stella readings (aspect-aware, tropical-framed)
  const [expanded, setExpanded] = useState<WesternBody | null>(null)
  const [readings, setReadings] = useState<Partial<Record<WesternBody, string>>>({})
  const [readingFor, setReadingFor] = useState<WesternBody | null>(null)

  async function askAboutPlacement(body: WesternBody) {
    if (!session || readingFor) return
    const p = chart.planets.find((pl) => pl.body === body)
    if (!p) return
    setReadingFor(body)
    try {
      const houseInfo = timeUnknown ? '' : `, in the ${p.house}th house`
      const asp = aspectsForBody(chart, body)
      const prompt =
        `Using WESTERN (tropical) astrology only — no Vedic concepts — give a focused reading ` +
        `(~90 words) of this single natal placement for ${birthData.name}: ` +
        `${body} in ${p.sign} at ${p.degree.toFixed(1)}°${houseInfo}${p.retrograde ? ', retrograde' : ''}. ` +
        (asp ? `Its aspects: ${asp}. ` : '') +
        `What does this placement signify psychologically? Flowing prose, no headings.`
      let acc = ''
      for await (const chunk of streamStella(prompt, { persona: 'warm' }, session.access_token)) {
        acc += chunk
        setReadings((prev) => ({ ...prev, [body]: acc }))
      }
    } catch (err: unknown) {
      setReadings((prev) => ({ ...prev, [body]: `⚠ ${err instanceof Error ? err.message : 'Stella is unavailable.'}` }))
    } finally {
      setReadingFor(null)
    }
  }

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
            {signCuspFlag(chart.ascendant.longitude) && (
              <p className="text-amber-300/80 text-[10px] mt-1 leading-snug">
                Near a sign boundary — a few minutes' difference in birth time could shift this to{' '}
                {signCuspFlag(chart.ascendant.longitude)!.neighbor}.
              </p>
            )}
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
        {chart.planets.map((p) => {
          const cusp = signCuspFlag(p.longitude)
          const isNode = p.body === 'North Node' || p.body === 'South Node'
          return (
            <div key={p.body} className="border-b border-cosmos-800/60 last:border-0">
              <button
                onClick={() => setExpanded(expanded === p.body ? null : p.body)}
                className="w-full grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2.5 items-center text-left hover:bg-cosmos-800/40 transition-colors"
              >
                <span className="text-slate-200 text-sm flex items-center gap-2">
                  <span className="text-stardust-300 w-5 text-center">{BODY_GLYPHS[p.body]}</span>
                  {p.body}
                  {p.retrograde && !isNode && (
                    <span className="text-rose-300 text-[10px]" title="Retrograde">℞</span>
                  )}
                </span>
                <span className="text-right text-slate-300 text-sm">
                  {SIGN_GLYPHS[p.sign]} {p.sign} <span className="text-slate-500">{fmtDeg(p.degree)}</span>
                  {cusp && (
                    <span className="block text-amber-300/80 text-[10px]" title={`On the cusp — within ${cusp.distance}° of ${cusp.neighbor}`}>
                      on the cusp · {SIGN_GLYPHS[cusp.neighbor]} {cusp.neighbor}
                    </span>
                  )}
                </span>
                <span className="text-right text-slate-400 text-sm pl-3 w-8">
                  {timeUnknown ? '' : p.house}
                </span>
              </button>

              {expanded === p.body && !isNode && (
                <div className="px-4 pb-3">
                  {readings[p.body] ? (
                    <div className="bg-cosmos-800/50 rounded-xl px-4 py-3">
                      <MarkdownText
                        text={readings[p.body] ?? ''}
                        className="text-slate-300 text-xs"
                        trailing={readingFor === p.body && (
                          <span className="inline-block w-1.5 h-3 ml-0.5 bg-stardust-400 animate-pulse align-text-bottom rounded-sm" />
                        )}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => void askAboutPlacement(p.body)}
                      disabled={readingFor !== null}
                      className="text-xs text-stardust-400 hover:text-stardust-300 transition-colors disabled:opacity-50"
                    >
                      {readingFor === p.body ? 'Stella is reading this placement…' : `✨ Ask Stella about ${p.body} in ${p.sign}`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
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

      {/* Deep-dive report */}
      {!timeUnknown && <WesternReportCard chart={chart} />}

      {/* Numerology — system-independent (birth date + name), shown on both chart views. */}
      <NumerologySection birthData={birthData} />

      <p className="mt-8 text-[11px] text-slate-600 text-center max-w-xs mx-auto">{ENTERTAINMENT_DISCLAIMER}</p>
    </div>
  )
}

const COST = 40

function WesternReportCard({ chart }: { chart: WesternChart }) {
  const { profile } = useUser()
  const isPremium = profile?.subscription_tier === 'premium'

  const context = useMemo(() => {
    const planets = chart.planets
      .filter((p) => p.body !== 'North Node' && p.body !== 'South Node')
      .map((p) => `${p.body} — ${p.sign} — house ${p.house}${p.retrograde ? ' (retrograde)' : ''}`)
      .join('\n')
    const aspects = chart.aspects
      .map((a) => `${a.a} ${a.type} ${a.b} (orb ${a.orb}°)`)
      .join('\n')
    return {
      name: chart.birth_data.name,
      ascendant: `${chart.ascendant.sign} ${chart.ascendant.degree.toFixed(1)}°`,
      midheaven: `${chart.midheaven.sign} ${chart.midheaven.degree.toFixed(1)}°`,
      house_system: chart.house_system === 'placidus' ? 'Placidus' : chart.house_system,
      planets,
      aspects,
    }
  }, [chart])

  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')
  const personaBlock = usePersonaBlock()

  async function load(unlock = false) {
    setError('')
    if (unlock) setLoading(true)
    try {
      const res = await getReport({ kind: 'western_birth_chart', context, persona: personaBlock || undefined, unlock })
      if (res.body) { setBody(res.body); setLocked(false) }
      else if (res.locked) setLocked(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the report.')
    } finally {
      setLoading(false)
    }
  }

  // Check ownership on mount (no charge).
  useEffect(() => { void load(false) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mt-6 bg-gradient-to-br from-cosmos-800/80 to-cosmos-900/80 border border-stellar-300/30 rounded-2xl px-5 py-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] uppercase tracking-widest text-stellar-300">Deep-Dive Report</p>
        <span className="text-base">♈</span>
      </div>
      <h2 className="text-slate-100 font-display text-xl mb-1">Western Chart Deep-Dive Reading</h2>

      {body ? (
        <MarkdownText text={body} className="text-slate-300 text-sm mt-3" />
      ) : loading ? (
        <p className="text-slate-500 text-xs mt-2">{locked ? 'Loading…' : 'Calculating…'}</p>
      ) : locked ? (
        <>
          <p className="text-slate-400 text-sm mt-1 mb-4">
            A full ~600-word reading of your tropical chart — your Sun, Moon and Rising "big three",
            your inner world, drive, and the outer planets, woven together through your aspects.
          </p>
          <button
            onClick={() => void load(true)}
            className="rounded-full px-5 py-2 bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-semibold"
          >
            {isPremium ? 'Generate report (free on Premium)' : `Unlock report · ${creditLabel(COST)}`}
          </button>
          {!isPremium && (
            <p className="text-[10px] text-slate-600 mt-2">
              One-time · about ${(COST * 0.1).toFixed(2)} in credits · yours to keep · free on{' '}
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
