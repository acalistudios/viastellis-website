/**
 * TarotSection — daily tarot on the home page.
 *
 * Free: today's daily card (deterministic by date, same for all users, no AI).
 * Paid: 3-card spread (Past / Present / Future), personalized per user+date,
 *       AI narrative via Gemini, 2 credits, premium free, cached for the day.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@/store/UserContext'
import {
  getDailyCard,
  getSpreadCards,
  getTarotSpread,
  SPREAD_POSITIONS,
  type TarotCard,
} from '@/lib/tarot'
import { creditLabel } from '@/config/creditCosts'
import type { NatalChart } from '@/types'

const COST = 2

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

interface Props {
  chart: NatalChart
}

export function TarotSection({ chart }: Props) {
  const { user, profile } = useUser()
  const isPremium = profile?.subscription_tier === 'premium'
  const date = todayStr()

  const dailyCard = useMemo(() => getDailyCard(date), [date])

  const spreadCards = useMemo(() => {
    if (!user) return null
    return getSpreadCards(user.id, date)
  }, [user, date])

  const context = useMemo(() => ({
    name: chart.birth_data.name,
    ascendant: chart.birth_data.time_unknown ? 'Unknown (no birth time)' : chart.ascendant.sign,
    moonSign: chart.planets.find(p => p.planet === 'Moon')?.sign ?? '',
    sunSign: chart.planets.find(p => p.planet === 'Sun')?.sign ?? '',
  }), [chart])

  const [spreadBody, setSpreadBody] = useState('')
  const [spreadLoading, setSpreadLoading] = useState(false)
  const [, setSpreadOwned] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState('')

  // Check if today's spread is already unlocked (free re-view).
  useEffect(() => {
    if (!spreadCards) return
    void (async () => {
      try {
        const res = await getTarotSpread({
          date,
          cardIndices: spreadCards.map(c => c.index) as [number, number, number],
          context,
          unlock: false,
        })
        if (res.body) { setSpreadBody(res.body); setSpreadOwned(true); setExpanded(true) }
      } catch { /* not yet unlocked — that's fine */ }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, user?.id])

  async function unlockSpread() {
    if (!spreadCards) return
    setError('')
    setSpreadLoading(true)
    try {
      const res = await getTarotSpread({
        date,
        cardIndices: spreadCards.map(c => c.index) as [number, number, number],
        context,
        unlock: true,
      })
      if (res.body) { setSpreadBody(res.body); setSpreadOwned(true); setExpanded(true) }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unlock your spread.')
    } finally {
      setSpreadLoading(false)
    }
  }

  return (
    <div className="w-full bg-cosmos-900 border border-cosmos-700 rounded-2xl px-5 py-4 mb-3 text-left">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-widest text-stardust-400">Daily Tarot</p>
        <span className="text-base">🃏</span>
      </div>

      {/* Free daily card */}
      <DailyCardDisplay card={dailyCard} />

      {/* 3-card spread */}
      {spreadCards && (
        <div className="mt-4 border-t border-cosmos-800 pt-4">
          {spreadBody && expanded ? (
            <>
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">
                Your spread today · Past · Present · Future
              </p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {spreadCards.map((card, i) => (
                  <MiniCard key={i} card={card} position={SPREAD_POSITIONS[i]} />
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {spreadBody}
              </p>
            </>
          ) : spreadLoading ? (
            <p className="text-slate-500 text-xs">Stella is reading the cards…</p>
          ) : (
            <>
              <p className="text-slate-400 text-sm mb-3">
                Reveal your 3-card Past · Present · Future spread for today, with Stella's reading.
              </p>
              <button
                onClick={() => void unlockSpread()}
                disabled={spreadLoading}
                className="rounded-full px-5 py-2 bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-semibold disabled:opacity-60"
              >
                {isPremium ? 'Reveal spread (free on Premium)' : `Reveal spread · ${creditLabel(COST)}`}
              </button>
              {!isPremium && (
                <p className="text-[10px] text-slate-600 mt-2">
                  Once per day · free on{' '}
                  <Link to="/upgrade" className="underline">Premium</Link>
                </p>
              )}
            </>
          )}
        </div>
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

function DailyCardDisplay({ card }: { card: TarotCard }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-10 h-14 bg-gradient-to-br from-stardust-400/20 to-stellar-300/20 border border-stardust-400/40 rounded-lg flex items-center justify-center">
        <span className="text-stardust-300 text-lg">✦</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-100 font-display text-base leading-snug">{card.name}</p>
        <p className="text-stardust-300 text-xs mt-0.5">{card.keywords.join(' · ')}</p>
        <p className="text-slate-400 text-xs mt-1 leading-relaxed">{card.upright}</p>
      </div>
    </div>
  )
}

function MiniCard({ card, position }: { card: TarotCard; position: string }) {
  return (
    <div className="bg-cosmos-800 border border-cosmos-700 rounded-xl p-2 text-center">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{position}</p>
      <div className="w-full aspect-[2/3] bg-gradient-to-br from-stardust-400/10 to-stellar-300/10 border border-stardust-400/20 rounded-lg flex items-center justify-center mb-1.5">
        <span className="text-stardust-300 text-sm">✦</span>
      </div>
      <p className="text-slate-200 text-[11px] font-medium leading-tight">{card.name}</p>
      <p className="text-slate-500 text-[10px] mt-0.5 leading-tight">{card.keywords[0]}</p>
    </div>
  )
}
