/**
 * skyContext — the "what was the sky doing" stamp attached to user-written
 * records at write time (journal entries, horoscope feedback).
 *
 * Kept in one place so every writer stamps the SAME field names: Stella's
 * journal pattern scan reads these back by key, so a second writer inventing
 * its own shape would silently drop out of that analysis.
 */

import { moonSiderealDeg, moonGocharaQuality, signFromDeg, getNakshatra } from '@/lib/ephemeris'
import { getPanchanga } from '@/lib/panchanga'
import type { ZodiacSign } from '@/types'

export interface SkyContext {
  moon_sign: ZodiacSign
  nakshatra: string
  /** Gochara quality of today's Moon vs the natal Moon — null without a chart. */
  gochara: string | null
  tithi: string
  phase: string
  /** Index signature keeps this assignable to the `jsonb` column's Json type. */
  [key: string]: string | null
}

/**
 * Stamp the sky as of now.
 * @param natalMoonSign the user's natal Moon sign; enables the gochara reading.
 */
export function currentSkyContext(natalMoonSign?: ZodiacSign): SkyContext {
  const now = new Date()
  const moonDeg = moonSiderealDeg(now)
  const moonSign = signFromDeg(moonDeg) as ZodiacSign
  const p = getPanchanga(now)
  return {
    moon_sign: moonSign,
    nakshatra: getNakshatra(moonDeg).name,
    gochara: natalMoonSign ? moonGocharaQuality(natalMoonSign, moonSign).quality : null,
    tithi: `${p.tithi.name} (${p.tithi.paksha})`,
    phase: p.moonPhase.name,
  }
}

/** The visitor's LOCAL calendar day as YYYY-MM-DD (not UTC — days must match what they see). */
export function localDateStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
