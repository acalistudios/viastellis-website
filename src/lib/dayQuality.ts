/**
 * dayQuality — "what kind of day is it?", computed in the SAME zodiac system as
 * the reading the user sees, so the mood line and the horoscope under it come
 * from one source.
 *
 *  - Vedic lenses (vedic_moon, personalized): Moon gochara — the sidereal Moon's
 *    sign counted from the natal Moon (the classical Vedic daily rule).
 *  - Western lenses (western_sun and the Sun-sign topic lenses): the tropical
 *    Moon's sign-based aspect to the natal Sun sign — trine/sextile/conjunction
 *    flow, square/opposition strain, semi-sextile/quincunx are mixed.
 *
 * The prose reading is still generated per sign, so wording can differ; what
 * this guarantees is that both rest on the same system and the same Moon sign.
 */

import {
  moonGocharaQuality,
  moonSiderealDeg,
  moonTropicalDeg,
  signFromDeg,
  ZODIAC_SIGNS,
  type GocharaQuality,
} from '@/lib/ephemeris'
import { westernSunSign } from '@/lib/westernSign'
import type { HoroscopeLens } from '@/lib/horoscope'
import type { NatalChart, UserProfile, ZodiacSign } from '@/types'

export type DaySystem = 'vedic' | 'western'

export interface DayQuality {
  system: DaySystem
  quality: GocharaQuality
  /** The Moon's sign today in this system (tropical for Western, sidereal for Vedic). */
  transitMoonSign: ZodiacSign
  /** Strongest caution: Vedic chandrashtama, or the Western opposition to the Sun sign. */
  restDay: boolean
  /** One plain sentence on why, for the "Why?" panel. */
  basis: string
}

/** The user's chosen (free, default) lens. Legacy 'vedic_sun' maps to the Vedic Moon reading. */
export function defaultHoroscopeLens(profile: Pick<UserProfile, 'default_horoscope_lens'> | null | undefined): HoroscopeLens {
  const raw = profile?.default_horoscope_lens
  return raw === 'vedic_sun' ? 'vedic_moon' : ((raw ?? 'western_sun') as HoroscopeLens)
}

export function lensSystem(lens: HoroscopeLens): DaySystem {
  return lens === 'vedic_moon' || lens === 'personalized' ? 'vedic' : 'western'
}

const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`

// Sign distance (0–11) from the natal Sun sign to the Moon's sign → Western aspect.
const WESTERN_ASPECTS: Record<number, { name: string; quality: GocharaQuality }> = {
  0:  { name: 'is in your Sun sign',                quality: 'favorable' },
  1:  { name: 'is next door to your Sun sign',      quality: 'neutral' },
  2:  { name: 'is in a sextile to your Sun sign',   quality: 'favorable' },
  3:  { name: 'is square your Sun sign',            quality: 'challenging' },
  4:  { name: 'is in a trine to your Sun sign',     quality: 'favorable' },
  5:  { name: 'is quincunx your Sun sign',          quality: 'neutral' },
  6:  { name: 'is opposite your Sun sign',          quality: 'challenging' },
  7:  { name: 'is quincunx your Sun sign',          quality: 'neutral' },
  8:  { name: 'is in a trine to your Sun sign',     quality: 'favorable' },
  9:  { name: 'is square your Sun sign',            quality: 'challenging' },
  10: { name: 'is in a sextile to your Sun sign',   quality: 'favorable' },
  11: { name: 'is next door to your Sun sign',      quality: 'neutral' },
}

export function getDayQuality(chart: NatalChart, system: DaySystem, now: Date = new Date()): DayQuality {
  if (system === 'western') {
    const sun = westernSunSign(chart.birth_data.date)
    const transitMoonSign = signFromDeg(moonTropicalDeg(now))
    const dist = (ZODIAC_SIGNS.indexOf(transitMoonSign) - ZODIAC_SIGNS.indexOf(sun) + 12) % 12
    const a = WESTERN_ASPECTS[dist]
    return {
      system,
      quality: a.quality,
      transitMoonSign,
      restDay: dist === 6,
      basis: `The Moon is in ${transitMoonSign} today and ${a.name}, ${sun}. In Western astrology, harmonious angles (trine, sextile) tend to feel easier; tense ones (square, opposition) ask more of you.`,
    }
  }

  const natalMoon = chart.planets.find(p => p.planet === 'Moon')!.sign
  const transitMoonSign = signFromDeg(moonSiderealDeg(now))
  const g = moonGocharaQuality(natalMoon, transitMoonSign)
  return {
    system,
    quality: g.quality,
    transitMoonSign,
    restDay: g.isChandrashtama,
    basis: `The Moon is in ${transitMoonSign} today, the ${ordinal(g.houseFromMoon)} sign from your natal Moon in ${natalMoon}. In Vedic astrology (gochara), that position sets the day's tone.`,
  }
}
