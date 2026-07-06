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
  getSpreadReversed,
  getTarotSpread,
  isDailyReversed,
  cardMeaning,
  SPREAD_POSITIONS,
  type TarotCard,
} from '@/lib/tarot'
import { creditLabel } from '@/config/creditCosts'
import { buildPersonaContext } from '@/lib/personalization'
import type { NatalChart } from '@/types'

const COST = 2

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// One reveal per user, per category, per day — persisted so revisits show the
// cards already turned over (no re-animation, no re-charge) until the date rolls.
function revealKey(userId: string | undefined, category: 'daily' | 'spread', date: string): string {
  return `viastellis-tarot-${category}-${userId ?? 'anon'}-${date}`
}
function wasRevealed(key: string): boolean {
  try { return localStorage.getItem(key) === '1' } catch { return false }
}
function markRevealed(key: string): void {
  try { localStorage.setItem(key, '1') } catch { /* ignore */ }
}

interface Props {
  chart: NatalChart
}

export function TarotSection({ chart }: Props) {
  const { user, profile, personalization, memories } = useUser()
  const isPremium = profile?.subscription_tier === 'premium'
  const date = todayStr()

  const personaBlock = useMemo(
    () => buildPersonaContext({
      personalization,
      birthDate: chart.birth_data.date,
      memories: memories.map(m => m.note),
    }),
    [personalization, memories, chart],
  )

  const dailyCard = useMemo(() => getDailyCard(date), [date])
  const dailyReversed = useMemo(() => isDailyReversed(date), [date])

  const spreadCards = useMemo(() => {
    if (!user) return null
    // Exclude the daily card so the spread never repeats it (daily + 3 = 4 unique).
    return getSpreadCards(user.id, date, [dailyCard.index])
  }, [user, date, dailyCard])

  const spreadReversed = useMemo(
    () => (user ? getSpreadReversed(user.id, date) : null),
    [user, date],
  )

  const context = useMemo(() => ({
    name: chart.birth_data.name,
    ascendant: chart.birth_data.time_unknown ? 'Unknown (no birth time)' : chart.ascendant.sign,
    moonSign: chart.planets.find(p => p.planet === 'Moon')?.sign ?? '',
    sunSign: chart.planets.find(p => p.planet === 'Sun')?.sign ?? '',
  }), [chart])

  const dailyKey = revealKey(user?.id, 'daily', date)
  const spreadKey = revealKey(user?.id, 'spread', date)

  // Daily card: free & deterministic, so reveal is purely client-side.
  const [dailyRevealed, setDailyRevealed] = useState(() => wasRevealed(dailyKey))
  const [dailyAnimate, setDailyAnimate] = useState(false)

  const [spreadBody, setSpreadBody] = useState('')
  const [spreadLoading, setSpreadLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  // Animate the flip only on a fresh reveal (a click) — not when restoring an
  // already-revealed spread on a same-day revisit.
  const [spreadAnimate, setSpreadAnimate] = useState(false)
  const [error, setError] = useState('')

  function revealDaily() {
    setDailyAnimate(true)
    setDailyRevealed(true)
    markRevealed(dailyKey)
  }

  // On mount, only restore the spread if it was already revealed today (this
  // device). Otherwise we wait for the click, so premium/owners still get the
  // flip instead of an auto-revealed board.
  useEffect(() => {
    if (!spreadCards || !wasRevealed(spreadKey)) return
    void (async () => {
      try {
        const res = await getTarotSpread({
          date,
          cardIndices: spreadCards.map(c => c.index) as [number, number, number],
          reversed: spreadReversed ?? undefined,
          meanings: spreadCards.map((c, i) => cardMeaning(c, spreadReversed?.[i] ?? false)) as [string, string, string],
          persona: personaBlock || undefined,
          context,
          unlock: false,
        })
        if (res.body) { setSpreadBody(res.body); setExpanded(true) } // spreadAnimate stays false → no re-flip
      } catch { /* not yet unlocked — that's fine */ }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, user?.id])

  async function unlockSpread() {
    if (!spreadCards) return
    setError('')
    setSpreadLoading(true)
    setSpreadAnimate(true)
    try {
      const res = await getTarotSpread({
        date,
        cardIndices: spreadCards.map(c => c.index) as [number, number, number],
        reversed: spreadReversed ?? undefined,
        meanings: spreadCards.map((c, i) => cardMeaning(c, spreadReversed?.[i] ?? false)) as [string, string, string],
        persona: personaBlock || undefined,
        context,
        unlock: true,
      })
      if (res.body) { setSpreadBody(res.body); setExpanded(true); markRevealed(spreadKey) }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unlock your spread.')
    } finally {
      setSpreadLoading(false)
    }
  }

  const revealed = Boolean(spreadBody) && expanded

  return (
    <div className="w-full bg-cosmos-900 border border-cosmos-700 rounded-2xl px-5 py-4 mb-3 text-left">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-widest text-stardust-400">Daily Tarot</p>
        <span className="text-base">🃏</span>
      </div>

      {/* Free daily card — click to reveal (once/day), then stays turned over */}
      <DailyCardDisplay
        card={dailyCard}
        reversed={dailyReversed}
        revealed={dailyRevealed}
        animate={dailyAnimate}
        onReveal={revealDaily}
      />

      {/* 3-card spread */}
      {spreadCards && (
        <div className="mt-4 border-t border-cosmos-800 pt-4">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">
            {revealed ? 'Your spread today' : "Today's spread"} · Past · Present · Future
          </p>

          {/* Card row — always mounted so backs can flip to faces in place */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {spreadCards.map((card, i) => {
              const rev = spreadReversed?.[i] ?? false
              return (
                <div key={i} className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{SPREAD_POSITIONS[i]}</p>
                  <FlipCard card={card} flipped={revealed} reversed={rev} delayMs={i * 160} animate={spreadAnimate} />
                  {/* Name + keyword fade in after the flip lands */}
                  <div
                    className={`transition-opacity duration-500 ${revealed ? 'opacity-100' : 'opacity-0'}`}
                    style={{ transitionDelay: revealed ? `${i * 160 + 400}ms` : '0ms' }}
                  >
                    <p className="text-slate-200 text-[11px] font-medium leading-tight mt-1.5">{card.name}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5 leading-tight">
                      {card.keywords[0]}{rev && <span className="text-amber-400/80"> · Reversed</span>}
                    </p>
                    {/* Canonical per-card meaning (deterministic, from the table) */}
                    <p className="text-slate-400 text-[10px] mt-1 leading-snug">{cardMeaning(card, rev)}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {revealed ? (
            <>
              <p className="text-[10px] uppercase tracking-widest text-stardust-400 mb-1.5">Stella's reading</p>
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

// Per-suit accent colour for card labels/keywords (matches the artwork palette).
const SUIT_STYLE: Record<string, { text: string }> = {
  major:     { text: 'text-stardust-300' },
  wands:     { text: 'text-amber-300' },
  cups:      { text: 'text-sky-300' },
  swords:    { text: 'text-slate-300' },
  pentacles: { text: 'text-emerald-300' },
}

/** Card artwork lives in public/tarot/<index>.jpg (index matches TAROT_CARDS). */
function cardImg(card: TarotCard): string {
  return `${import.meta.env.BASE_URL}tarot/${card.index}.jpg`
}

function DailyCardDisplay({ card, reversed = false, revealed, animate, onReveal }: {
  card: TarotCard; reversed?: boolean; revealed: boolean; animate: boolean; onReveal: () => void
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-24">
        <FlipCard card={card} flipped={revealed} reversed={reversed} animate={animate} />
      </div>
      <div className="flex-1 min-w-0">
        {revealed ? (
          <>
            <p className="text-slate-100 font-display text-base leading-snug">
              {card.name}
              {reversed && <span className="text-amber-400/80 text-xs font-sans font-normal ml-2 align-middle">Reversed</span>}
            </p>
            <p className={`${SUIT_STYLE[card.suit].text} text-xs mt-0.5`}>{card.keywords.join(' · ')}</p>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">{cardMeaning(card, reversed)}</p>
          </>
        ) : (
          <>
            <p className="text-slate-100 font-display text-base leading-snug">Your card for today</p>
            <p className="text-slate-500 text-xs mt-0.5">Turn it over to see what the day holds.</p>
            <button
              onClick={onReveal}
              className="mt-2 rounded-full px-4 py-1.5 bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-xs font-semibold"
            >
              Reveal today&apos;s card
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * FlipCard — a 3D card that shows its back and flips to reveal the face.
 * Both images stay mounted; `flipped` rotates the container 180° so the
 * hidden-backface faces swap. A `reversed` card's face carries an extra
 * in-plane 180° (rotateZ) so it lands physically upside-down once revealed.
 * `delayMs` staggers the three spread cards. Reduced-motion users get an
 * instant swap (no rotation animation).
 */
function FlipCard({ card, flipped, reversed = false, delayMs = 0, animate = true }: { card: TarotCard; flipped: boolean; reversed?: boolean; delayMs?: number; animate?: boolean }) {
  const faceClasses =
    'absolute inset-0 w-full h-full object-cover rounded-lg border border-stardust-400/20 shadow-lg shadow-cosmos-950/50 [backface-visibility:hidden]'
  return (
    <div className="[perspective:1000px]">
      <div
        className={`relative w-full aspect-[300/525] [transform-style:preserve-3d] ${
          animate ? 'transition-transform duration-700 ease-out motion-reduce:transition-none motion-reduce:duration-0' : ''
        }`}
        style={{
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transitionDelay: animate && flipped ? `${delayMs}ms` : '0ms',
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}tarot/card-back.png`}
          alt=""
          aria-hidden
          loading="lazy"
          className={faceClasses}
        />
        <img
          src={cardImg(card)}
          alt={reversed ? `${card.name} (reversed)` : card.name}
          loading="lazy"
          style={{ transform: reversed ? 'rotateY(180deg) rotateZ(180deg)' : 'rotateY(180deg)' }}
          className={faceClasses}
        />
      </div>
    </div>
  )
}
