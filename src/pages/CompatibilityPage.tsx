/**
 * Vibe Match — Task 8
 *
 * Enter a second person's birth data → both charts are computed locally →
 * deterministic vibe score → optional Stella AI narrative (via stella-chat
 * Edge Function — degrades gracefully if not deployed).
 */

import { useState, useRef, useEffect, useCallback, useMemo, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/store/UserContext'
import { useNatalChart } from '@/hooks/useNatalChart'
import { calculateNatalChart } from '@/lib/ephemeris'
import { computeVibeScore, type VibeResult } from '@/lib/vibe'
import { searchCities, getTimezone, type CityResult } from '@/lib/geocoding'
import { CELEBRITIES } from '@/data/celebrities'
import { streamStella } from '@/lib/gemini'
import { CreditCost } from '@/components/ui/CreditCost'
import { SynastryReportCard } from '@/components/chart/SynastryReportCard'
import { CREDIT_COSTS } from '@/config/creditCosts'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MarkdownText } from '@/components/ui/MarkdownText'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'
import type { BirthData, NatalChart } from '@/types'

interface HistoryItem {
  id: string
  vibe_score: number | null
  summary: string | null
  created_at: string
  partnerName: string
}

interface CelebrityMatch {
  celebrity: (typeof CELEBRITIES)[number]
  chart: NatalChart
  vibe: VibeResult
  sunSign: string
  moonSign: string
  bestSignal: string
  tier: string
}

function formatBirthday(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function matchTier(score: number): string {
  if (score >= 85) return 'Excellent'
  if (score >= 75) return 'Strong'
  if (score >= 65) return 'Easy'
  if (score >= 50) return 'Interesting'
  return 'Growth edge'
}

function bestSignal(vibe: VibeResult): string {
  const firstHighlight = vibe.highlights[0] ?? ''
  if (firstHighlight.startsWith('Moons')) return 'Emotional rhythm'
  if (firstHighlight.startsWith('Sun')) return 'Shared temperament'
  if (firstHighlight.startsWith('Venus')) return 'Creative spark'
  if (vibe.tensions.some(t => t.startsWith('Moons'))) return 'Emotional growth'
  if (vibe.tensions.some(t => t.startsWith('Venus'))) return 'Chemistry lesson'
  return 'Balanced mix'
}

export function CompatibilityPage() {
  const { session, user } = useUser()
  const { chart: myChart, chartId: myChartId, loading: chartLoading } = useNatalChart()

  // Person B form state
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<CityResult[]>([])
  const [city, setCity] = useState<CityResult | null>(null)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Result state
  const [result, setResult] = useState<{ vibe: VibeResult; chartB: NatalChart } | null>(null)
  const [narrative, setNarrative] = useState('')
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)
  const [summaryCopied, setSummaryCopied] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])

  const loadHistory = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('compatibility_reports')
      .select('id, vibe_score, summary, created_at, chart_b:birth_charts!chart_b_id(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) {
      setHistory(
        (data as unknown as Array<HistoryItem & { chart_b: { name: string } | null }>).map(r => ({
          ...r,
          partnerName: r.chart_b?.name ?? 'Unknown',
        }))
      )
    }
  }, [user])

  useEffect(() => { void loadHistory() }, [loadHistory])

  const celebrityMatches = useMemo<CelebrityMatch[]>(() => {
    if (!myChart) return []
    return CELEBRITIES
      .map((celebrity) => {
        const chart = calculateNatalChart(celebrity)
        const vibe = computeVibeScore(myChart, chart)
        return {
          celebrity,
          chart,
          vibe,
          sunSign: chart.planets.find(p => p.planet === 'Sun')?.sign ?? 'Unknown',
          moonSign: chart.planets.find(p => p.planet === 'Moon')?.sign ?? 'Unknown',
          bestSignal: bestSignal(vibe),
          tier: matchTier(vibe.score),
        }
      })
      .sort((a, b) => b.vibe.score - a.vibe.score || a.celebrity.name.localeCompare(b.celebrity.name))
  }, [myChart])

  /** Persist person B as a saved (non-primary) chart + the report row. */
  async function saveReport(birthDataB: BirthData, vibe: VibeResult, summary: string) {
    if (!user || !myChartId) return
    try {
      const { data: chartBRow, error: chartErr } = await supabase
        .from('birth_charts')
        .insert({
          user_id: user.id,
          label: birthDataB.name,
          is_primary: false,
          name: birthDataB.name,
          birth_date: birthDataB.date,
          birth_time: birthDataB.time_unknown ? null : birthDataB.time,
          time_unknown: birthDataB.time_unknown,
          city: birthDataB.city,
          country: birthDataB.country,
          latitude: birthDataB.latitude,
          longitude: birthDataB.longitude,
          timezone: birthDataB.timezone,
          chart_data: null,
          calculated_at: null,
        })
        .select('id')
        .single()
      if (chartErr || !chartBRow) throw chartErr

      const { error: reportErr } = await supabase.from('compatibility_reports').insert({
        user_id: user.id,
        chart_a_id: myChartId,
        chart_b_id: chartBRow.id,
        vibe_score: vibe.score,
        summary: summary || null,
        strengths: vibe.highlights,
        tensions: vibe.tensions,
        full_report: { moon: vibe.moon, sun: vibe.sun, venusMars: vibe.venusMars },
      })
      if (reportErr) throw reportErr
      void loadHistory()
    } catch {
      // History persistence is best-effort — never block the on-screen result
    }
  }

  function handleCityChange(value: string) {
    setCityQuery(value)
    setCity(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (value.trim().length < 2) { setCityResults([]); return }
      setSearching(true)
      try {
        setCityResults(await searchCities(value))
      } catch { /* transient search errors are non-fatal */ } finally {
        setSearching(false)
      }
    }, 400)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!city || !date || !name.trim()) return
    const timezone = getTimezone(city.latitude, city.longitude)
    await runMatch({
      name: name.trim(),
      date,
      time: time || '12:00',
      time_unknown: !time,
      city: city.city,
      country: city.country,
      latitude: city.latitude,
      longitude: city.longitude,
      timezone,
    })
  }

  function compareCelebrity(celebrity: (typeof CELEBRITIES)[number]) {
    setName(celebrity.name)
    setDate(celebrity.date)
    setTime('')
    setCityQuery(`${celebrity.city}, ${celebrity.country}`)
    setCity({
      city: celebrity.city,
      country: celebrity.country,
      display_name: `${celebrity.city}, ${celebrity.country}`,
      latitude: celebrity.latitude,
      longitude: celebrity.longitude,
    })
    setCityResults([])
    void runMatch(celebrity)
  }

  async function runMatch(birthDataB: BirthData) {
    if (!myChart) return
    setError('')
    setNarrative('')

    try {
      const chartB = calculateNatalChart(birthDataB)
      const vibe = computeVibeScore(myChart, chartB)
      setResult({ vibe, chartB })
      let finalNarrative = ''

      // Ask Stella for the narrative (requires deployed Edge Function)
      if (session) {
        setNarrativeLoading(true)
        try {
          const prompt =
            `Write a "Stellar Synergy" reading (~150 words) for ${myChart.birth_data.name} + ${birthDataB.name}. ` +
            `Vibe score: ${vibe.score}/100. ` +
            `Emotional connection (Moons): ${vibe.moon.label}. ` +
            `Core compatibility (Suns): ${vibe.sun.label}. ` +
            `Attraction/dynamic (Venus–Mars): ${vibe.venusMars.label}. ` +
            `Communication style: ${vibe.communication?.label ?? 'mixed approaches'}. ` +
            `Address: emotional sync, how they'd handle a disagreement, their collaborative strengths, and any natural friction points. ` +
            `Frame it as "here's how you work together" not just romance. Flowing prose, no lists, warm tone.`

          let text = ''
          for await (const chunk of streamStella(prompt, { persona: 'warm' }, session.access_token)) {
            text += chunk
            setNarrative(text)
          }
          finalNarrative = text
        } catch (err: unknown) {
          // Score still shows — only the AI narrative is unavailable
          setNarrative('')
          setError(err instanceof Error ? err.message : 'Stella could not write the reading right now.')
        } finally {
          setNarrativeLoading(false)
        }
      }

      // Persist to history (best-effort, non-blocking for the UI)
      void saveReport(birthDataB, vibe, finalNarrative)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not compute the match.')
    }
  }

  if (chartLoading) {
    return (
      <div className="flex items-center justify-center min-h-full py-24">
        <span className="w-8 h-8 rounded-full border-2 border-stardust-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  /** Plain-text summary of the match, shared by the email and copy actions. */
  function matchSummaryText({ greeting }: { greeting: boolean }): string {
    if (!result || !myChart) return ''
    const v = result.vibe
    const myName = myChart.birth_data.name
    const partnerName = result.chartB.birth_data.name
    const stripMd = (s: string) => s.replace(/\*\*/g, '').replace(/^#{1,6}\s+/gm, '').trim()

    const header =
      (greeting ? `Hi,\n\n` : '') +
      `Our ViaStellis Vibe Match — ${myName} and ${partnerName}:\n\n` +
      `✨ Vibe Score: ${v.score}/100\n\n` +
      `☽ Moons: ${v.moon.label}\n` +
      `☉ Suns: ${v.sun.label}\n` +
      `♀♂ Spark: ${v.venusMars.label}\n`
    const footer = `\n\nCurious about your own charts? Try it free at ${window.location.origin}\n\n(For reflection and entertainment only.)`

    // Keep the body short enough that the encoded mailto URL stays well under the
    // ~2000-char limit some older email clients impose (encoding inflates length).
    let reading = stripMd(narrative)
    const room = 1300 - header.length - footer.length
    if (reading.length > room) reading = reading.slice(0, Math.max(0, room - 30)).trimEnd() + '…\n(full reading on ViaStellis)'
    return header + (reading ? `\nStella's reading:\n${reading}` : '') + footer
  }

  // Open the user's own email client, pre-filled. We never send anything ourselves.
  function emailMatch() {
    if (!result) return
    const subject = `Our ViaStellis Vibe Match — ${result.vibe.score}/100 ✨`
    const body = matchSummaryText({ greeting: true })
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  async function copyMatch() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(matchSummaryText({ greeting: false }))
      setSummaryCopied(true)
      setTimeout(() => setSummaryCopied(false), 2500)
    } catch { /* clipboard unavailable — ignore */ }
  }

  return (
    <div className="px-5 py-8 max-w-lg mx-auto">
      <h1 className="font-display text-3xl text-stardust-300 text-center mb-1">Vibe Match</h1>
      <p className="text-slate-500 text-xs text-center mb-8">
        How do your stars dance with someone else's?
      </p>

      {/* Person B form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-8">
        <Input
          label="Their name"
          placeholder="Name or nickname"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Birth date"
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
            required
            className="[color-scheme:dark]"
          />
          <Input
            label="Birth time (optional)"
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="[color-scheme:dark]"
          />
        </div>

        <div className="relative">
          <Input
            label="Birth city"
            placeholder="Type a city…"
            value={cityQuery}
            onChange={e => handleCityChange(e.target.value)}
            autoComplete="off"
            required
          />
          {cityResults.length > 0 && !city && (
            <ul className="absolute z-20 mt-1 w-full bg-cosmos-800 border border-cosmos-600 rounded-xl overflow-hidden shadow-2xl">
              {cityResults.map((r, i) => (
                <li
                  key={i}
                  onClick={() => { setCity(r); setCityQuery(r.display_name); setCityResults([]) }}
                  className="px-4 py-3 text-sm text-slate-300 hover:bg-cosmos-700 cursor-pointer border-b border-cosmos-700 last:border-0"
                >
                  {r.display_name}
                </li>
              ))}
            </ul>
          )}
          {searching && <p className="text-xs text-slate-500 mt-1.5">Searching…</p>}
          {city && <p className="text-xs text-emerald-400 mt-1.5">✓ {city.display_name}</p>}
        </div>

        <Button type="submit" size="lg" disabled={!name.trim() || !date || !city}>
          <span className="inline-flex items-center gap-1">
            ✨ Check the Vibe <CreditCost credits={CREDIT_COSTS.compatibility} color="text-cosmos-950/70" />
          </span>
        </Button>
      </form>

      {/* Celebrity matches */}
      {celebrityMatches.length > 0 && (
        <section className="mb-8 bg-cosmos-900 border border-cosmos-700 rounded-2xl overflow-hidden">
          <div className="px-4 py-4 border-b border-cosmos-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-stardust-300">Celebrity Matches</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Ranked against your chart using the same Vibe Match scoring.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-stardust-400/30 px-3 py-1 text-[10px] uppercase tracking-wider text-stardust-300">
                Top {Math.min(celebrityMatches.length, 10)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[620px] w-full text-left text-xs">
              <thead className="text-slate-500 uppercase tracking-wider bg-cosmos-950/40">
                <tr>
                  <th className="px-4 py-3 font-medium">Celebrity</th>
                  <th className="px-3 py-3 font-medium">Birthday</th>
                  <th className="px-3 py-3 font-medium">Sun</th>
                  <th className="px-3 py-3 font-medium">Moon</th>
                  <th className="px-3 py-3 font-medium">Score</th>
                  <th className="px-3 py-3 font-medium">Best signal</th>
                  <th className="px-4 py-3 font-medium text-right">Compare</th>
                </tr>
              </thead>
              <tbody>
                {celebrityMatches.slice(0, 10).map(match => (
                  <tr key={match.celebrity.name} className="border-t border-cosmos-800/80">
                    <td className="px-4 py-3">
                      <p className="text-slate-200 text-sm whitespace-nowrap">
                        <span aria-hidden="true">{match.celebrity.emoji}</span> {match.celebrity.name}
                      </p>
                      <p className="text-[10px] text-slate-600 whitespace-nowrap">
                        {match.tier} match
                      </p>
                    </td>
                    <td className="px-3 py-3 text-slate-400 whitespace-nowrap">
                      {formatBirthday(match.celebrity.date)}
                    </td>
                    <td className="px-3 py-3 text-slate-300">{match.sunSign}</td>
                    <td className="px-3 py-3 text-slate-300">{match.moonSign}</td>
                    <td className="px-3 py-3">
                      <span className="font-display text-xl text-stardust-300">{match.vibe.score}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{match.bestSignal}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => compareCelebrity(match.celebrity)}
                        className="rounded-full border border-stardust-400/30 px-3 py-1.5 text-[11px] font-medium text-stardust-300 hover:border-stardust-400/70 hover:text-stardust-200 transition-colors"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="px-4 py-3 border-t border-cosmos-800 text-[10px] text-slate-600">
            Celebrity charts use public birthdays and city-level birthplaces. Birth times are marked unknown, so Rising signs and house-based precision are intentionally excluded.
          </p>
        </section>
      )}

      {/* Partner invite link */}
      {myChart && (
        <div className="mb-8 text-center">
          <button
            onClick={() => {
              const json = JSON.stringify({
                n: myChart.birth_data.name,
                d: myChart.birth_data.date,
                t: myChart.birth_data.time_unknown ? null : myChart.birth_data.time,
                c: myChart.birth_data.city,
                co: myChart.birth_data.country,
                la: myChart.birth_data.latitude,
                lo: myChart.birth_data.longitude,
                tz: myChart.birth_data.timezone,
              })
              // UTF-8 → base64url. Plain btoa() throws on non-Latin1 names/cities
              // (e.g. "Łódź"), so encode to bytes first.
              const bytes = new TextEncoder().encode(json)
              let binary = ''
              bytes.forEach(b => { binary += String.fromCharCode(b) })
              const payload = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
              const link = `${window.location.origin}/match?d=${payload}`
              void navigator.clipboard.writeText(link)
              setError('')
              setInviteCopied(true)
              setTimeout(() => setInviteCopied(false), 2500)
            }}
            className="text-xs text-stardust-400 hover:text-stardust-300 border border-cosmos-700 hover:border-stardust-400/50 rounded-full px-5 py-2.5 transition-colors"
          >
            {inviteCopied ? '✓ Link copied — send it to them!' : '🔗 Invite someone to match with you'}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl p-6 mb-6">
          {/* Score dial */}
          <div className="text-center mb-5">
            <p className="text-6xl font-display text-stardust-300">{result.vibe.score}</p>
            <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">Vibe Score / 100</p>
            <div className="h-2 bg-cosmos-800 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-stardust-400 to-stellar-300 rounded-full transition-all duration-1000"
                style={{ width: `${result.vibe.score}%` }}
              />
            </div>
          </div>

          {/* Dynamics */}
          <div className="flex flex-col gap-2 mb-5 text-sm">
            <p className="text-slate-300"><span className="text-stardust-400">☽ Moons:</span> {result.vibe.moon.label}</p>
            <p className="text-slate-300"><span className="text-stardust-400">☉ Suns:</span> {result.vibe.sun.label}</p>
            <p className="text-slate-300"><span className="text-stardust-400">♀♂ Spark:</span> {result.vibe.venusMars.label}</p>
          </div>

          {/* Stella narrative */}
          {(narrative || narrativeLoading) && (
            <div className="border-t border-cosmos-700 pt-4">
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Stella's reading</p>
              <MarkdownText
                text={narrative}
                className="text-slate-300 text-sm"
                trailing={narrativeLoading && (
                  <span className="inline-block w-2 h-4 ml-0.5 bg-stardust-400 animate-pulse align-text-bottom rounded-sm" />
                )}
              />
            </div>
          )}

          {/* Share this match — email (own client) or copy the summary */}
          <div className="border-t border-cosmos-700 pt-4 mt-1 flex items-center justify-center gap-3">
            <button
              onClick={emailMatch}
              className="text-xs text-stardust-400 hover:text-stardust-300 border border-cosmos-700 hover:border-stardust-400/50 rounded-full px-5 py-2.5 transition-colors"
            >
              📧 Email this match
            </button>
            <button
              onClick={() => void copyMatch()}
              className="text-xs text-stardust-400 hover:text-stardust-300 border border-cosmos-700 hover:border-stardust-400/50 rounded-full px-5 py-2.5 transition-colors"
            >
              {summaryCopied ? '✓ Copied!' : '📋 Copy summary'}
            </button>
          </div>

          {/* Synastry deep-dive report (one-time, per-pair) */}
          {myChart && (
            <SynastryReportCard myChart={myChart} partnerChart={result.chartB} />
          )}
        </div>
      )}

      {error && (
        <p className="text-rose-400 text-xs bg-rose-400/10 border border-rose-400/20 rounded-lg px-4 py-3 mb-6 text-center">
          {error}
        </p>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm text-slate-400 font-medium mb-3 px-1">Past matches</h2>
          <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl overflow-hidden">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between px-4 py-3 border-b border-cosmos-800 last:border-0">
                <div>
                  <p className="text-slate-200 text-sm">{h.partnerName}</p>
                  <p className="text-slate-600 text-[11px]">
                    {new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-stardust-300 font-display text-xl">{h.vibe_score ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-600 text-center max-w-xs mx-auto">{ENTERTAINMENT_DISCLAIMER}</p>
    </div>
  )
}
