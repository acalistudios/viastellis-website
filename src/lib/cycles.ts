/**
 * Long-cycle trackers — features #4 and #6.
 *
 *  - Sade Sati: Saturn's ~7.5-year transit of the 12th, 1st, and 2nd signs
 *    from the natal Moon (rising → peak → setting phases). Also flags the
 *    smaller "dhaiya" transits (Saturn in the 4th or 8th from the Moon).
 *  - Solar Return: the instant the transiting Sun returns to its exact natal
 *    sidereal longitude — the "birthday chart" anchor.
 */

import {
  dateToJde,
  lahiriAyanamsa,
  norm360,
  signFromDeg,
  getNakshatra,
  sunSiderealDeg,
  moonSiderealDeg,
  calculateAscendant,
} from './ephemeris'
import { Planet } from 'astronomia/planetposition'
import earthData from 'astronomia/data/vsop87Bearth'
import saturnData from 'astronomia/data/vsop87Bsaturn'
import type { ZodiacSign } from '@/types'

const SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

const RAD2DEG = 180 / Math.PI
const DAY_MS = 86400000

const earth = new Planet(earthData)
const saturn = new Planet(saturnData)

/** Sidereal sign of transiting Saturn at a given instant. */
export function saturnSiderealSign(date: Date): ZodiacSign {
  const jde = dateToJde(date)
  const e = earth.position(jde)
  const s = saturn.position(jde)
  const cosB = (b: number) => Math.cos(b)
  const ex = e.range * cosB(e.lat) * Math.cos(e.lon)
  const ey = e.range * cosB(e.lat) * Math.sin(e.lon)
  const sx = s.range * cosB(s.lat) * Math.cos(s.lon)
  const sy = s.range * cosB(s.lat) * Math.sin(s.lon)
  const tropical = norm360(Math.atan2(sy - ey, sx - ex) * RAD2DEG)
  return signFromDeg(norm360(tropical - lahiriAyanamsa(jde))) as ZodiacSign
}

/** Finds (to ~1 day) when Saturn entered its current sign and when it leaves. */
function saturnSignWindow(date: Date): { entered: Date; leaves: Date } {
  const sign = saturnSiderealSign(date)

  // Walk backward in 30-day steps until the sign differs, then bisect
  let lo = date.getTime()
  while (saturnSiderealSign(new Date(lo - 30 * DAY_MS)) === sign) lo -= 30 * DAY_MS
  let a = lo - 30 * DAY_MS, b = lo
  while (b - a > DAY_MS) {
    const mid = (a + b) / 2
    if (saturnSiderealSign(new Date(mid)) === sign) b = mid
    else a = mid
  }
  const entered = new Date(b)

  // Walk forward similarly
  let hi = date.getTime()
  while (saturnSiderealSign(new Date(hi + 30 * DAY_MS)) === sign) hi += 30 * DAY_MS
  a = hi; b = hi + 30 * DAY_MS
  while (b - a > DAY_MS) {
    const mid = (a + b) / 2
    if (saturnSiderealSign(new Date(mid)) === sign) a = mid
    else b = mid
  }
  const leaves = new Date(a)

  return { entered, leaves }
}

export interface SadeSatiStatus {
  active: boolean
  /** 'rising' (12th), 'peak' (1st), 'setting' (2nd) — null when not in Sade Sati */
  phase: 'rising' | 'peak' | 'setting' | null
  /** Saturn in the 4th or 8th from Moon (the smaller dhaiya transits) */
  dhaiya: 'ardha-ashtama (4th)' | 'ashtama (8th)' | null
  saturnSign: ZodiacSign
  houseFromMoon: number
  /** Current Saturn-sign window (≈ phase boundaries) */
  since: Date
  until: Date
}

export function getSadeSati(natalMoonSign: ZodiacSign, date: Date = new Date()): SadeSatiStatus {
  const saturnSign = saturnSiderealSign(date)
  const houseFromMoon = ((SIGNS.indexOf(saturnSign) - SIGNS.indexOf(natalMoonSign) + 12) % 12) + 1

  const phase =
    houseFromMoon === 12 ? 'rising' as const
      : houseFromMoon === 1 ? 'peak' as const
      : houseFromMoon === 2 ? 'setting' as const
      : null

  const dhaiya =
    houseFromMoon === 4 ? 'ardha-ashtama (4th)' as const
      : houseFromMoon === 8 ? 'ashtama (8th)' as const
      : null

  const { entered, leaves } = saturnSignWindow(date)

  return {
    active: phase !== null,
    phase,
    dhaiya,
    saturnSign,
    houseFromMoon,
    since: entered,
    until: leaves,
  }
}

// ─── Solar Return ─────────────────────────────────────────────────────────────

export interface SolarReturn {
  /** Exact instant of the Sun's return to its natal longitude */
  instant: Date
  /** Ascendant sign of the return chart (computed at the birth location) */
  lagnaSign: ZodiacSign
  /** Moon placement at the return */
  moonSign: ZodiacSign
  moonNakshatra: string
}

/**
 * Next solar return on/after `from`, for a natal sidereal Sun longitude.
 * Newton-style refinement: the Sun moves ~0.9856°/day.
 */
export function nextSolarReturn(
  natalSunDeg: number,
  birthLatitude: number,
  birthLongitude: number,
  from: Date = new Date()
): SolarReturn {
  // Initial guess: when is the Sun next at natalSunDeg? Start from `from`.
  let t = from.getTime()
  const diff = norm360(natalSunDeg - sunSiderealDeg(new Date(t)))
  t += (diff / 0.9856) * DAY_MS

  // Refine (signed correction now that we're close)
  for (let i = 0; i < 5; i++) {
    let d = norm360(natalSunDeg - sunSiderealDeg(new Date(t)))
    if (d > 180) d -= 360
    t += (d / 0.9856) * DAY_MS
  }
  const instant = new Date(t)

  const jde = dateToJde(instant)
  const ascTropical = calculateAscendant(jde, birthLatitude, birthLongitude)
  const lagnaSign = signFromDeg(norm360(ascTropical - lahiriAyanamsa(jde))) as ZodiacSign

  const moonDeg = moonSiderealDeg(instant)

  return {
    instant,
    lagnaSign,
    moonSign: signFromDeg(moonDeg) as ZodiacSign,
    moonNakshatra: getNakshatra(moonDeg).name,
  }
}
