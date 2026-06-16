/**
 * Muhurta day-picker — Task: "find a good day"
 *
 * Scores upcoming days for the user by combining two classical Vedic systems:
 *
 *  1. Tarabala — count from the natal Moon's nakshatra to the day's transiting
 *     nakshatra; the count mod 9 gives one of nine taras:
 *       1 Janma (one's own star — mixed/caution)   2 Sampat (wealth — very good)
 *       3 Vipat (danger — avoid)                   4 Kshema (well-being — good)
 *       5 Pratyak (obstacles — avoid)              6 Sadhana (achievement — good)
 *       7 Naidhana (loss — most avoided)           8 Mitra (friend — good)
 *       9 Parama Mitra (great friend — excellent)
 *
 *  2. Moon gochara — the transiting Moon's house from the natal Moon
 *     (already implemented in ephemeris.ts; chandrashtama = strongest caution).
 *
 * Day score = 60% tarabala + 40% gochara, sampled at local noon.
 * Entertainment framing only — this is a "pick a nice day" helper, not advice.
 */

import {
  moonSiderealDeg,
  moonGocharaQuality,
  signFromDeg,
  getNakshatra,
  NAKSHATRAS,
  type GocharaQuality,
} from './ephemeris'
import type { ZodiacSign } from '@/types'

const NAKSHATRA_SPAN = 360 / 27

export interface Tara {
  num: number
  name: string
  meaning: string
  good: boolean
}

const TARAS: Tara[] = [
  { num: 1, name: 'Janma',        meaning: 'your own star — keep it personal', good: false },
  { num: 2, name: 'Sampat',       meaning: 'prosperity — strong for beginnings', good: true },
  { num: 3, name: 'Vipat',        meaning: 'obstacles — classical avoid day', good: false },
  { num: 4, name: 'Kshema',       meaning: 'well-being — gentle and safe', good: true },
  { num: 5, name: 'Pratyak',      meaning: 'resistance — things push back', good: false },
  { num: 6, name: 'Sadhana',      meaning: 'achievement — good for effort & goals', good: true },
  { num: 7, name: 'Naidhana',     meaning: 'loss — the classical rest day', good: false },
  { num: 8, name: 'Mitra',        meaning: 'friendly — smooth cooperation', good: true },
  { num: 9, name: 'Parama Mitra', meaning: 'great friend — the best of the cycle', good: true },
]

const TARA_SCORES = [40, 90, 15, 75, 20, 80, 5, 85, 100] // index = tara - 1

const GOCHARA_SCORES: Record<GocharaQuality, number> = {
  favorable: 90,
  neutral: 55,
  challenging: 20,
}

export interface DayScore {
  date: Date
  score: number // 0–100
  tara: Tara
  gochara: GocharaQuality
  isChandrashtama: boolean
  moonSign: ZodiacSign
  nakshatra: string
}

/** Tarabala for a transit nakshatra index relative to the natal one. */
export function getTara(natalNakIndex: number, transitNakIndex: number): Tara {
  const count = ((transitNakIndex - natalNakIndex + 27) % 27) + 1
  return TARAS[(count - 1) % 9]
}

/**
 * Scores the next `daysAhead` days (starting tomorrow) for the user.
 * `natalMoonDeg` is the sidereal longitude of the natal Moon.
 */
export function scoreUpcomingDays(
  natalMoonDeg: number,
  daysAhead = 30,
  from: Date = new Date()
): DayScore[] {
  const natalNakIndex = Math.floor(natalMoonDeg / NAKSHATRA_SPAN) % 27
  const natalMoonSign = signFromDeg(natalMoonDeg) as ZodiacSign

  const out: DayScore[] = []
  for (let i = 1; i <= daysAhead; i++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i, 12, 0, 0)
    const moonDeg = moonSiderealDeg(date)
    const moonSign = signFromDeg(moonDeg) as ZodiacSign
    const nak = getNakshatra(moonDeg)
    const transitNakIndex = NAKSHATRAS.indexOf(nak.name)

    const tara = getTara(natalNakIndex, transitNakIndex)
    const g = moonGocharaQuality(natalMoonSign, moonSign)

    let gocharaScore = GOCHARA_SCORES[g.quality]
    if (g.isChandrashtama) gocharaScore = 5

    const score = Math.round(0.6 * TARA_SCORES[tara.num - 1] + 0.4 * gocharaScore)

    out.push({
      date,
      score,
      tara,
      gochara: g.quality,
      isChandrashtama: g.isChandrashtama,
      moonSign,
      nakshatra: nak.name,
    })
  }
  return out
}

/** Top N days from the scored window, best first. */
export function bestDays(scores: DayScore[], n = 5): DayScore[] {
  return [...scores].sort((a, b) => b.score - a.score || a.date.getTime() - b.date.getTime()).slice(0, n)
}
