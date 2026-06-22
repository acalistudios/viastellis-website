/**
 * Boundary ("cusp") proximity flags.
 *
 * Surfaces the genuinely useful edge cases — NOT the ~0.02° engine tolerance,
 * which is invisible to users. Thresholds:
 *   - Sign boundary (30°): within ~1° → "born on the cusp" of two signs.
 *   - Nakshatra boundary (13.333°): within ~0.5° → matters in Vedic because the
 *     Moon's nakshatra sets the dasha sequence (a small birth-time error could
 *     shift it). [[project-viastellis-dual-zodiac]]
 *
 * The dominant real-world source of "which sign am I?" uncertainty is birth-time
 * accuracy (the Ascendant moves ~1° every 4 minutes), so the Ascendant flag is
 * meant to be paired with a time-aware message in the UI.
 */

import { ZODIAC_SIGNS, NAKSHATRAS } from './ephemeris'
import type { ZodiacSign } from '@/types'

const SIGN_SPAN = 30
const NAK_SPAN = 360 / 27 // 13.333…°

export interface CuspFlag {
  /** 'entering' = just past the start of its sign (neighbor is the previous sign);
   *  'leaving'  = near the end of its sign (neighbor is the next sign). */
  edge: 'entering' | 'leaving'
  neighbor: ZodiacSign
  /** Degrees from the exact boundary (0 = exactly on it). */
  distance: number
}

/**
 * Flag a tropical/sidereal longitude that sits within `orb`° of a sign boundary.
 * Returns null when comfortably inside a sign.
 */
export function signCuspFlag(longitude: number, orb = 1): CuspFlag | null {
  const lon = ((longitude % 360) + 360) % 360
  const pos = lon % SIGN_SPAN
  const signIdx = Math.floor(lon / SIGN_SPAN) % 12

  if (pos <= orb) {
    return {
      edge: 'entering',
      neighbor: ZODIAC_SIGNS[(signIdx + 11) % 12], // previous sign
      distance: parseFloat(pos.toFixed(2)),
    }
  }
  if (pos >= SIGN_SPAN - orb) {
    return {
      edge: 'leaving',
      neighbor: ZODIAC_SIGNS[(signIdx + 1) % 12], // next sign
      distance: parseFloat((SIGN_SPAN - pos).toFixed(2)),
    }
  }
  return null
}

export interface NakshatraEdgeFlag {
  neighbor: string
  distance: number
}

/**
 * Flag a sidereal longitude within `orb`° of a nakshatra boundary.
 * Returns null when comfortably inside a nakshatra.
 */
export function nakshatraEdgeFlag(siderealLon: number, orb = 0.5): NakshatraEdgeFlag | null {
  const lon = ((siderealLon % 360) + 360) % 360
  const pos = lon % NAK_SPAN
  const nakIdx = Math.floor(lon / NAK_SPAN) % 27

  if (pos <= orb) {
    return { neighbor: NAKSHATRAS[(nakIdx + 26) % 27], distance: parseFloat(pos.toFixed(2)) }
  }
  if (pos >= NAK_SPAN - orb) {
    return { neighbor: NAKSHATRAS[(nakIdx + 1) % 27], distance: parseFloat((NAK_SPAN - pos).toFixed(2)) }
  }
  return null
}
