/**
 * SynastryReportCard — one-time, per-pair Vedic relationship deep-dive.
 * Generated once from BOTH charts, stored per (user, partner), re-viewable
 * free forever after purchase. Premium = free. Lives on the Vibe Match result.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@/store/UserContext'
import { getSynastryReport, partnerKeyOf } from '@/lib/synastryReport'
import { creditLabel } from '@/config/creditCosts'
import type { NatalChart } from '@/types'

const cost = 40

function planetsOf(chart: NatalChart): string {
  return chart.planets
    .filter(p => p.planet !== 'Ascendant')
    .map(p => `${p.planet} — ${p.sign} — house ${p.house}${p.retrograde ? ' (retrograde)' : ''}`)
    .join('\n')
}

function ascOf(chart: NatalChart): string {
  return chart.birth_data.time_unknown ? 'Unknown (no birth time)' : chart.ascendant.sign
}

interface Props {
  myChart: NatalChart
  partnerChart: NatalChart
}

export function SynastryReportCard({ myChart, partnerChart }: Props) {
  const { profile } = useUser()
  const isPremium = profile?.subscription_tier === 'premium'

  const partnerKey = useMemo(
    () => partnerKeyOf(partnerChart.birth_data.name, partnerChart.birth_data.date),
    [partnerChart],
  )
  const context = useMemo(() => ({
    userName: myChart.birth_data.name,
    userAscendant: ascOf(myChart),
    userPlanets: planetsOf(myChart),
    partnerName: partnerChart.birth_data.name,
    partnerAscendant: ascOf(partnerChart),
    partnerPlanets: planetsOf(partnerChart),
  }), [myChart, partnerChart])

  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [owned, setOwned] = useState(false)
  const [error, setError] = useState('')

  async function load(unlock = false) {
    setError('')
    if (unlock) setLoading(true)
    try {
      const res = await getSynastryReport({ partnerKey, context, unlock })
      if (res.body) { setBody(res.body); setOwned(true) }
      else if (res.locked) setOwned(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the report.')
    } finally {
      setLoading(false)
    }
  }

  // On mount / partner change, check ownership (free) — does NOT charge.
  useEffect(() => {
    setBody(''); setOwned(false); setLoading(true)
    void load(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerKey])

  return (
    <div className="border-t border-cosmos-700 pt-4 mt-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] uppercase tracking-widest text-stellar-300">Synastry Deep-Dive</p>
        <span className="text-base">💞</span>
      </div>

      {body ? (
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mt-2">{body}</p>
      ) : loading ? (
        <p className="text-slate-500 text-xs mt-2">{owned ? 'Loading…' : 'Stella is comparing your charts…'}</p>
      ) : (
        <>
          <p className="text-slate-400 text-sm mt-1 mb-4">
            A full Vedic relationship report comparing both charts — emotional rapport, attraction,
            communication, strengths, and friction points, with how to work through them.
          </p>
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
