/**
 * Classical yoga detection — feature #3.
 *
 * Implements a conservative set of widely documented yogas with unambiguous
 * rules. Each detector is pure sign/house math on the computed chart.
 * Lagna-dependent yogas are skipped when birth time is unknown.
 */

import type { NatalChart, Planet, ZodiacSign } from '@/types'

const SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

/** Own and exaltation signs for the five Mahapurusha planets. */
const DIGNITY: Partial<Record<Planet, ZodiacSign[]>> = {
  Mars:    ['Aries', 'Scorpio', 'Capricorn'],
  Mercury: ['Gemini', 'Virgo'],                 // Virgo is both own and exaltation
  Jupiter: ['Sagittarius', 'Pisces', 'Cancer'],
  Venus:   ['Taurus', 'Libra', 'Pisces'],
  Saturn:  ['Capricorn', 'Aquarius', 'Libra'],
}

const MAHAPURUSHA: Array<{ planet: Planet; yoga: string; theme: string }> = [
  { planet: 'Mars',    yoga: 'Ruchaka',  theme: 'courage, drive, and command' },
  { planet: 'Mercury', yoga: 'Bhadra',   theme: 'intellect, wit, and eloquence' },
  { planet: 'Jupiter', yoga: 'Hamsa',    theme: 'wisdom, ethics, and good fortune' },
  { planet: 'Venus',   yoga: 'Malavya',  theme: 'charm, art, and comforts' },
  { planet: 'Saturn',  yoga: 'Sasa',     theme: 'discipline, endurance, and authority' },
]

export interface YogaResult {
  name: string
  description: string
}

/** 1-based sign count from sign a to sign b. */
function countFrom(a: ZodiacSign, b: ZodiacSign): number {
  return ((SIGNS.indexOf(b) - SIGNS.indexOf(a) + 12) % 12) + 1
}

export function detectYogas(chart: NatalChart): YogaResult[] {
  const get = (name: Planet) => chart.planets.find(p => p.planet === name)!
  const timeUnknown = chart.birth_data.time_unknown

  const sun = get('Sun')
  const moon = get('Moon')
  const results: YogaResult[] = []

  // ── Budhaditya: Sun + Mercury in the same sign ────────────────────────────
  if (get('Mercury').sign === sun.sign) {
    results.push({
      name: 'Budhaditya Yoga',
      description: 'Sun and Mercury share a sign — classically linked to sharp intelligence, communication skill, and administrative talent.',
    })
  }

  // ── Gajakesari: Jupiter in a kendra (1/4/7/10) from the Moon ──────────────
  if ([1, 4, 7, 10].includes(countFrom(moon.sign, get('Jupiter').sign))) {
    results.push({
      name: 'Gajakesari Yoga',
      description: 'Jupiter stands in a kendra from your Moon — the "elephant–lion" yoga of lasting reputation, optimism, and protection in difficulty.',
    })
  }

  // ── Chandra-Mangala: Moon + Mars in the same sign ─────────────────────────
  if (get('Mars').sign === moon.sign) {
    results.push({
      name: 'Chandra-Mangala Yoga',
      description: 'Moon and Mars conjoined — classically tied to entrepreneurial energy and material drive, with emotions and action tightly fused.',
    })
  }

  // ── Sunapha / Anapha / Durudhara / Kemadruma (planets around the Moon) ────
  // Counted planets exclude Sun, Rahu, Ketu per the classical rule.
  const countable = chart.planets.filter(
    p => !['Sun', 'Moon', 'Rahu', 'Ketu', 'Ascendant'].includes(p.planet)
  )
  const second = countable.some(p => countFrom(moon.sign, p.sign) === 2)
  const twelfth = countable.some(p => countFrom(moon.sign, p.sign) === 12)

  if (second && twelfth) {
    results.push({
      name: 'Durudhara Yoga',
      description: 'Planets flank your Moon on both sides — read as a balanced, well-resourced mind with support arriving from multiple directions.',
    })
  } else if (second) {
    results.push({
      name: 'Sunapha Yoga',
      description: 'A planet in the 2nd from your Moon — classically self-made wealth and a steady, capable mind.',
    })
  } else if (twelfth) {
    results.push({
      name: 'Anapha Yoga',
      description: 'A planet in the 12th from your Moon — polish, charisma, and a generous, renunciate streak.',
    })
  } else {
    const withMoon = countable.some(p => p.sign === moon.sign)
    if (!withMoon) {
      results.push({
        name: 'Kemadruma Yoga',
        description: 'No classical planets adjoin your Moon — traditionally read as early self-reliance; modern readers note it often marks fiercely independent people.',
      })
    }
  }

  // ── Vesi / Vosi / Ubhayachari (planets around the Sun, excluding Moon) ────
  const sunCountable = chart.planets.filter(
    p => !['Sun', 'Moon', 'Rahu', 'Ketu', 'Ascendant'].includes(p.planet)
  )
  const sunSecond = sunCountable.some(p => countFrom(sun.sign, p.sign) === 2)
  const sunTwelfth = sunCountable.some(p => countFrom(sun.sign, p.sign) === 12)
  if (sunSecond && sunTwelfth) {
    results.push({
      name: 'Ubhayachari Yoga',
      description: 'Planets on both sides of your Sun — classically an influential, well-connected life with broad capability.',
    })
  } else if (sunSecond) {
    results.push({
      name: 'Vesi Yoga',
      description: 'A planet in the 2nd from your Sun — associated with truthfulness, balance, and a measured public presence.',
    })
  } else if (sunTwelfth) {
    results.push({
      name: 'Vosi Yoga',
      description: 'A planet in the 12th from your Sun — associated with skillfulness, learning, and quiet generosity.',
    })
  }

  // ── Pancha Mahapurusha (needs houses → birth time) ────────────────────────
  if (!timeUnknown) {
    for (const { planet, yoga, theme } of MAHAPURUSHA) {
      const p = get(planet)
      const inDignity = DIGNITY[planet]!.includes(p.sign)
      const inKendra = [1, 4, 7, 10].includes(p.house)
      if (inDignity && inKendra) {
        results.push({
          name: `${yoga} Yoga (Mahapurusha)`,
          description: `${planet} stands in strength in a kendra — one of the five "great person" yogas, marking ${theme}.`,
        })
      }
    }
  }

  return results
}
