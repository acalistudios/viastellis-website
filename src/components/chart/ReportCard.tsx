/**
 * ReportCard — a one-time, personalized deep-dive report (career / year-ahead /
 * birth-chart). Generated once from the full chart, stored permanently,
 * re-viewable free forever. Premium = free.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@/store/UserContext'
import { birthDataToJde } from '@/lib/ephemeris'
import { calculateVimshottari, findCurrentDasha } from '@/lib/dasha'
import { getReport, type ReportKind } from '@/lib/report'
import { creditLabel } from '@/config/creditCosts'
import type { NatalChart } from '@/types'

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']

interface Props {
  chart: NatalChart
  kind: ReportKind
  emoji: string
  title: string
  description: string
  cost: number
}

export function ReportCard({ chart, kind, emoji, title, description, cost }: Props) {
  const { profile } = useUser()
  const isPremium = profile?.subscription_tier === 'premium'

  const context = useMemo(() => {
    const planets = chart.planets
      .filter(p => p.planet !== 'Ascendant')
      .map(p => `${p.planet} — ${p.sign} — house ${p.house}${p.retrograde ? ' (retrograde)' : ''}`)
      .join('\n')

    let dasha: string | undefined
    try {
      const moon = chart.planets.find(p => p.planet === 'Moon')!
      const moonDeg = SIGNS.indexOf(moon.sign) * 30 + moon.degree
      const jde = birthDataToJde(
        chart.birth_data.date,
        chart.birth_data.time_unknown ? null : chart.birth_data.time,
        chart.birth_data.timezone,
      )
      const current = findCurrentDasha(calculateVimshottari(moonDeg, new Date((jde - 2440587.5) * 86400000)))
      if (current) dasha = `${current.maha.lord} mahadasha, ${current.antar.lord} antardasha`
    } catch { /* dasha optional */ }

    return {
      name: chart.birth_data.name,
      ascendant: chart.birth_data.time_unknown ? 'Unknown (no birth time)' : chart.ascendant.sign,
      planets,
      dasha,
    }
  }, [chart])

  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [owned, setOwned] = useState(false)
  const [error, setError] = useState('')

  async function load(unlock = false) {
    setError('')
    if (unlock) setLoading(true)
    try {
      const res = await getReport({ kind, context, unlock })
      if (res.body) { setBody(res.body); setOwned(true) }
      else if (res.locked) setOwned(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the report.')
    } finally {
      setLoading(false)
    }
  }

  // On mount, check whether it's already owned (free) — does NOT charge.
  useEffect(() => {
    void load(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mt-4 bg-gradient-to-br from-cosmos-800/80 to-cosmos-900/80 border border-stellar-300/30 rounded-2xl px-5 py-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] uppercase tracking-widest text-stellar-300">Deep-Dive Report</p>
        <span className="text-base">{emoji}</span>
      </div>
      <h2 className="text-slate-100 font-display text-xl mb-1">{title}</h2>

      {body ? (
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mt-3">{body}</p>
      ) : loading ? (
        <p className="text-slate-500 text-xs mt-2">{owned ? 'Loading…' : 'Stella is reading your chart…'}</p>
      ) : (
        <>
          <p className="text-slate-400 text-sm mt-1 mb-4">{description}</p>
          <button
            onClick={() => void load(true)}
            disabled={loading}
            className="rounded-full px-5 py-2 bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-semibold disabled:opacity-60"
          >
            {isPremium ? 'Generate report (free on Premium)' : `Unlock report · ${creditLabel(cost)}`}
          </button>
          {!isPremium && (
            <p className="text-[10px] text-slate-600 mt-2">
              One-time · about ${(cost * 0.1).toFixed(2)} in credits · yours to keep · free on{' '}
              <Link to="/upgrade" className="underline">Premium</Link>
            </p>
          )}
        </>
      )}

      {error && (
        <p className="text-rose-400 text-xs mt-2">
          {error}{' '}
          {error.includes('credit') && <Link to="/upgrade" className="underline">Get credits</Link>}
        </p>
      )}
    </div>
  )
}
