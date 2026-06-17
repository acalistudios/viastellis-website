/**
 * Divisional charts (vargas) — feature #2. Currently: Navamsa (D9).
 *
 * Navamsa: each sign is divided into 9 parts of 3°20′. The navamsa sign for a
 * longitude is `(signIndex × 9 + partIndex) mod 12` — a compact identity that
 * reproduces the classical rule (movable signs count from themselves, fixed
 * from their 9th, dual from their 5th).
 */

import type { NatalChart, PlanetPosition, ZodiacSign } from '@/types'

const SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

const NAVAMSA_SPAN = 30 / 9 // 3°20′

/** Navamsa sign for an absolute sidereal longitude (0–360). */
export function navamsaSign(siderealDeg: number): ZodiacSign {
  const signIdx = Math.floor(siderealDeg / 30) % 12
  const part = Math.floor((siderealDeg % 30) / NAVAMSA_SPAN)
  return SIGNS[(signIdx * 9 + part) % 12]
}

export interface NavamsaChart {
  /** D9 sign of the natal Ascendant (the navamsa lagna), if birth time known */
  lagnaSign: ZodiacSign | null
  /** Planets re-mapped into navamsa signs, with D9 whole-sign houses from the navamsa lagna */
  planets: Array<Pick<PlanetPosition, 'planet' | 'sign' | 'retrograde'> & { house: number }>
}

/** Builds the D9 chart from a computed natal (D1) chart. */
export function navamsaChart(chart: NatalChart): NavamsaChart {
  const timeUnknown = chart.birth_data.time_unknown

  const absDeg = (p: { sign: ZodiacSign; degree: number }) =>
    SIGNS.indexOf(p.sign) * 30 + p.degree

  const lagnaSign = timeUnknown ? null : navamsaSign(absDeg(chart.ascendant))

  // House reference: navamsa lagna, or D9 Moon sign when time is unknown
  const moon = chart.planets.find(p => p.planet === 'Moon')!
  const refSign = lagnaSign ?? navamsaSign(absDeg(moon))
  const refIdx = SIGNS.indexOf(refSign)

  const planets = chart.planets
    .filter(p => p.planet !== 'Ascendant')
    .map(p => {
      const sign = navamsaSign(absDeg(p))
      return {
        planet: p.planet,
        sign,
        retrograde: p.retrograde,
        house: ((SIGNS.indexOf(sign) - refIdx + 12) % 12) + 1,
      }
    })

  return { lagnaSign, planets }
}
