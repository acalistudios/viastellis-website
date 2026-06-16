/**
 * Vibe Match scoring — Task 8
 *
 * Deterministic, transparent synastry heuristics (entertainment only):
 *
 *  - Moon harmony (0–40): the angular relationship between the two natal
 *    Moon signs. Trines/sextiles flow, oppositions complement, 6/8 and
 *    2/12 relationships carry classical friction.
 *  - Element harmony (0–30): Sun-sign elements. Same element resonates;
 *    fire+air and earth+water feed each other.
 *  - Venus–Mars spark (0–30): cross-aspect of A's Venus to B's Mars and
 *    vice versa — the classical attraction axis.
 *
 * The numeric score seeds the AI narrative; Stella writes the story.
 */

import type { NatalChart, ZodiacSign } from '@/types'

const SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

type Element = 'fire' | 'earth' | 'air' | 'water'

const ELEMENTS: Record<ZodiacSign, Element> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
}

/** 1-based sign distance from a to b (1 = same sign, 7 = opposite). */
function signDistance(a: ZodiacSign, b: ZodiacSign): number {
  return ((SIGNS.indexOf(b) - SIGNS.indexOf(a) + 12) % 12) + 1
}

/** Scores an angular sign relationship out of `max`. Symmetrical distances (d and 14-d) score the same. */
function angleScore(dist: number, max: number): { score: number; label: string } {
  // Normalize: 1↔1, 2↔12, 3↔11, 4↔10, 5↔9, 6↔8, 7↔7
  const d = Math.min(dist, 14 - dist)
  switch (d) {
    case 1: return { score: max * 0.85, label: 'same sign — instant familiarity' }
    case 5: return { score: max, label: 'trine — effortless flow' }
    case 3: return { score: max * 0.9, label: 'sextile — easy friendship' }
    case 7: return { score: max * 0.75, label: 'opposition — magnetic complements' }
    case 4: return { score: max * 0.55, label: 'square — productive friction' }
    case 6: return { score: max * 0.35, label: '6/8 relationship — classical friction zone' }
    case 2: return { score: max * 0.45, label: '2/12 relationship — different rhythms' }
    default: return { score: max * 0.5, label: 'mixed angles' }
  }
}

function elementScore(a: ZodiacSign, b: ZodiacSign, max: number): { score: number; label: string } {
  const ea = ELEMENTS[a]
  const eb = ELEMENTS[b]
  if (ea === eb) return { score: max, label: `both ${ea} — shared temperament` }
  const pair = [ea, eb].sort().join('+')
  if (pair === 'air+fire') return { score: max * 0.85, label: 'fire + air — mutual fuel' }
  if (pair === 'earth+water') return { score: max * 0.85, label: 'earth + water — mutual nourishment' }
  if (pair === 'fire+water') return { score: max * 0.4, label: 'fire + water — steamy but volatile' }
  if (pair === 'air+earth') return { score: max * 0.45, label: 'air + earth — different speeds' }
  return { score: max * 0.55, label: 'contrasting elements' }
}

/** Communication harmony from Mercury sign placement. */
function communicationScore(mercA: ZodiacSign, mercB: ZodiacSign): { label: string } {
  const commSigns = ['Gemini', 'Virgo', 'Aquarius', 'Sagittarius']
  const aComm = commSigns.includes(mercA)
  const bComm = commSigns.includes(mercB)

  if (aComm && bComm) return { label: 'both articulate — words flow naturally' }
  if (aComm || bComm) return { label: 'one speaks easily — may need patience from the other' }

  const dist = signDistance(mercA, mercB)
  if ([5, 3].includes(Math.min(dist, 14 - dist))) {
    return { label: 'Mercury harmony — understanding comes with curiosity' }
  }
  return { label: 'different communication rhythms — learning required' }
}

export interface VibeResult {
  score: number // 0–100
  moon: { distance: number; label: string }
  sun: { label: string }
  venusMars: { label: string }
  communication?: { label: string }
  highlights: string[]
  tensions: string[]
}

export function computeVibeScore(a: NatalChart, b: NatalChart): VibeResult {
  const get = (c: NatalChart, name: string) => c.planets.find(p => p.planet === name)!

  const moonA = get(a, 'Moon').sign
  const moonB = get(b, 'Moon').sign
  const sunA = get(a, 'Sun').sign
  const sunB = get(b, 'Sun').sign
  const venusA = get(a, 'Venus').sign
  const venusB = get(b, 'Venus').sign
  const marsA = get(a, 'Mars').sign
  const marsB = get(b, 'Mars').sign

  // Moon harmony — 0–40
  const moonDist = signDistance(moonA, moonB)
  const moon = angleScore(moonDist, 40)

  // Sun element harmony — 0–30
  const sun = elementScore(sunA, sunB, 30)

  // Venus–Mars spark — 0–30 (best of both cross-directions)
  const vmAB = angleScore(signDistance(venusA, marsB), 30)
  const vmBA = angleScore(signDistance(venusB, marsA), 30)
  const venusMars = vmAB.score >= vmBA.score ? vmAB : vmBA

  // Communication harmony (Mercury) — informational only, not scored
  const mercA = get(a, 'Mercury').sign
  const mercB = get(b, 'Mercury').sign
  const communication = communicationScore(mercA, mercB)

  const score = Math.round(moon.score + sun.score + venusMars.score)

  const parts = [
    { name: 'Moons', ...moon, max: 40 },
    { name: 'Sun elements', ...sun, max: 30 },
    { name: 'Venus–Mars', ...venusMars, max: 30 },
  ]
  const highlights = parts.filter(p => p.score / p.max >= 0.7).map(p => `${p.name}: ${p.label}`)
  const tensions = parts.filter(p => p.score / p.max < 0.5).map(p => `${p.name}: ${p.label}`)

  return {
    score: Math.max(5, Math.min(100, score)), // never a brutal 0 — it's entertainment
    moon: { distance: moonDist, label: moon.label },
    sun: { label: sun.label },
    venusMars: { label: venusMars.label },
    communication,
    highlights,
    tensions,
  }
}
