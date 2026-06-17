/**
 * Vimshottari Dasha — the classical 120-year planetary period system.
 *
 * Rules (standard Parashari):
 *  - Nine lords in fixed order, fixed durations (years), total 120:
 *      Ketu 7 · Venus 20 · Sun 6 · Moon 10 · Mars 7 · Rahu 18 ·
 *      Jupiter 16 · Saturn 19 · Mercury 17
 *  - Nakshatra lords cycle through that same order starting at Ashwini = Ketu,
 *    repeating every 9 nakshatras (3 full cycles over the 27).
 *  - The first mahadasha is the lord of the Moon's nakshatra at birth. Its
 *    remaining balance equals the *untraversed* fraction of that nakshatra.
 *  - Antardashas (sub-periods) within a mahadasha start from the mahadasha's
 *    own lord and proceed in order; each lasts mahaYears × antarYears / 120.
 *
 * Convention: 1 dasha year = 365.25 days (solar year), the most common
 * software convention (Jagannatha Hora / Parashara's Light default).
 */

import type { Planet } from '@/types'

export type DashaLord = Exclude<Planet, 'Ascendant'>

/** Fixed Vimshottari order and durations (years). */
export const DASHA_SEQUENCE: Array<{ lord: DashaLord; years: number }> = [
  { lord: 'Ketu',    years: 7 },
  { lord: 'Venus',   years: 20 },
  { lord: 'Sun',     years: 6 },
  { lord: 'Moon',    years: 10 },
  { lord: 'Mars',    years: 7 },
  { lord: 'Rahu',    years: 18 },
  { lord: 'Jupiter', years: 16 },
  { lord: 'Saturn',  years: 19 },
  { lord: 'Mercury', years: 17 },
]

const YEAR_MS = 365.25 * 86400000
const NAKSHATRA_SPAN = 360 / 27 // 13°20′

export interface MahaDasha {
  lord: DashaLord
  start: Date
  end: Date
}

export interface AntarDasha {
  mahaLord: DashaLord
  lord: DashaLord
  start: Date
  end: Date
}

/**
 * Computes the full sequence of mahadashas covering 120 years from birth.
 *
 * @param moonSiderealDeg  Sidereal (Lahiri) longitude of the natal Moon, 0–360
 * @param birthInstant     The birth moment as an absolute Date
 */
export function calculateVimshottari(moonSiderealDeg: number, birthInstant: Date): MahaDasha[] {
  // Which nakshatra, and how far through it the Moon has traveled
  const nakIndex = Math.floor(moonSiderealDeg / NAKSHATRA_SPAN) % 27
  const traversedFraction = (moonSiderealDeg % NAKSHATRA_SPAN) / NAKSHATRA_SPAN

  // Lord of the birth nakshatra (Ashwini=Ketu, cycling every 9)
  const startSeqIdx = nakIndex % 9
  const firstLord = DASHA_SEQUENCE[startSeqIdx]

  // Balance of the first dasha = untraversed fraction of the nakshatra
  const firstBalanceYears = firstLord.years * (1 - traversedFraction)

  const periods: MahaDasha[] = []
  let cursor = birthInstant.getTime()

  // First (partial) mahadasha
  let end = cursor + firstBalanceYears * YEAR_MS
  periods.push({ lord: firstLord.lord, start: new Date(cursor), end: new Date(end) })
  cursor = end

  // Remaining 8 full mahadashas (completes one 120-year wheel)
  for (let i = 1; i < 9; i++) {
    const { lord, years } = DASHA_SEQUENCE[(startSeqIdx + i) % 9]
    end = cursor + years * YEAR_MS
    periods.push({ lord, start: new Date(cursor), end: new Date(end) })
    cursor = end
  }

  return periods
}

/** Expands a mahadasha into its nine antardashas. */
export function getAntardashas(maha: MahaDasha): AntarDasha[] {
  const mahaSeqIdx = DASHA_SEQUENCE.findIndex(d => d.lord === maha.lord)
  const mahaYears = DASHA_SEQUENCE[mahaSeqIdx].years
  const totalMs = maha.end.getTime() - maha.start.getTime()

  // NOTE: for the partial first mahadasha, the antardashas that already elapsed
  // before birth are compressed away — we scale proportionally over the visible
  // window only when the period is complete. For exactness with a partial first
  // period, we reconstruct the *full* period and clip to [start, end].
  const fullMs = mahaYears * YEAR_MS
  const isPartial = totalMs < fullMs - 86400000 // more than a day short = partial

  // Reconstruct the notional full-period start (before birth for partial periods)
  const fullStart = isPartial ? maha.end.getTime() - fullMs : maha.start.getTime()

  const result: AntarDasha[] = []
  let cursor = fullStart
  for (let i = 0; i < 9; i++) {
    const sub = DASHA_SEQUENCE[(mahaSeqIdx + i) % 9]
    const lenMs = (mahaYears * sub.years / 120) * YEAR_MS
    const subStart = cursor
    const subEnd = cursor + lenMs
    cursor = subEnd

    // Clip to the actual (possibly partial) window; skip fully-elapsed subs
    if (subEnd <= maha.start.getTime()) continue
    result.push({
      mahaLord: maha.lord,
      lord: sub.lord,
      start: new Date(Math.max(subStart, maha.start.getTime())),
      end: new Date(subEnd),
    })
  }
  return result
}

/** Finds the mahadasha + antardasha active on a given date. */
export function findCurrentDasha(
  mahadashas: MahaDasha[],
  date: Date = new Date()
): { maha: MahaDasha; antar: AntarDasha } | null {
  const t = date.getTime()
  const maha = mahadashas.find(m => t >= m.start.getTime() && t < m.end.getTime())
  if (!maha) return null
  const antar = getAntardashas(maha).find(a => t >= a.start.getTime() && t < a.end.getTime())
  return antar ? { maha, antar } : null
}
