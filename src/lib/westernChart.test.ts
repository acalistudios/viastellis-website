/**
 * Western chart engine validation.
 *
 * Primary reference: J2000.0 (2000-01-01 12:00 UTC), London (51.5°N, 0°W).
 * Known tropical values at this instant (standard ephemeris):
 *   - Sun  ≈ 280.46° → Capricorn ~10.5°
 *   - The tropical Sun must be ~24° HIGHER than the sidereal Sun (Sagittarius
 *     ~16.6°) the Vedic engine produces — that 24° gap is the ayanamsa.
 *
 * Secondary checks: house cusp ordering, opposite-cusp symmetry, aspect sanity.
 */

import { describe, it, expect } from 'vitest'
import { calculateWesternChart } from './westernChart'
import { calculateNatalChart } from './ephemeris'
import type { BirthData } from '@/types'

const j2000: BirthData = {
  name: 'J2000', date: '2000-01-01', time: '12:00', time_unknown: false,
  city: 'London', country: 'UK', latitude: 51.5, longitude: 0.0, timezone: 'UTC',
}

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
]
const absLon = (sign: string, deg: number) => SIGNS.indexOf(sign) * 30 + deg

describe('Western tropical positions', () => {
  it('places the Sun at tropical Capricorn ~10.5° (J2000)', () => {
    const c = calculateWesternChart(j2000)
    const sun = c.planets.find(p => p.body === 'Sun')!
    expect(sun.sign).toBe('Capricorn')
    expect(sun.longitude).toBeGreaterThan(279.5)
    expect(sun.longitude).toBeLessThan(281.5)
  })

  it('tropical Sun sits ~24° ahead of the Vedic sidereal Sun (the ayanamsa gap)', () => {
    const w = calculateWesternChart(j2000)
    const v = calculateNatalChart(j2000)
    const wSun = w.planets.find(p => p.body === 'Sun')!.longitude
    const vSun = v.planets.find(p => p.planet === 'Sun')!
    const vLon = absLon(vSun.sign, vSun.degree)
    const gap = ((wSun - vLon) % 360 + 360) % 360
    expect(gap).toBeGreaterThan(23.4)
    expect(gap).toBeLessThan(24.3)
  })

  it('includes the three outer planets', () => {
    const c = calculateWesternChart(j2000)
    for (const body of ['Uranus', 'Neptune', 'Pluto'] as const) {
      const p = c.planets.find(x => x.body === body)
      expect(p, `${body} present`).toBeTruthy()
      expect(p!.longitude).toBeGreaterThanOrEqual(0)
      expect(p!.longitude).toBeLessThan(360)
    }
  })

  it('Pluto is in tropical Sagittarius at J2000 (~11–12°)', () => {
    // Pluto was at ~11.4° Sagittarius on 2000-01-01 (standard ephemeris).
    const c = calculateWesternChart(j2000)
    const pluto = c.planets.find(p => p.body === 'Pluto')!
    expect(pluto.sign).toBe('Sagittarius')
  })

  it('North and South Node are exactly opposite', () => {
    const c = calculateWesternChart(j2000)
    const n = c.planets.find(p => p.body === 'North Node')!
    const s = c.planets.find(p => p.body === 'South Node')!
    expect(separation(n.longitude, s.longitude)).toBeCloseTo(180, 0)
  })
})

describe('Placidus houses', () => {
  it('returns 12 cusps using placidus at mid-latitude', () => {
    const c = calculateWesternChart(j2000)
    expect(c.houses).toHaveLength(12)
    expect(c.house_system).toBe('placidus')
  })

  it('cusps advance monotonically around the zodiac', () => {
    const c = calculateWesternChart(j2000)
    for (let i = 0; i < 12; i++) {
      const a = c.houses[i].longitude
      const b = c.houses[(i + 1) % 12].longitude
      const span = ((b - a) % 360 + 360) % 360
      expect(span, `house ${i + 1}→${(i % 12) + 2} span`).toBeGreaterThan(0)
      expect(span).toBeLessThan(180) // no house spans more than half the sky
    }
  })

  it('opposite cusps are 180° apart (1↔7, 10↔4)', () => {
    const c = calculateWesternChart(j2000)
    expect(separation(c.houses[0].longitude, c.houses[6].longitude)).toBeCloseTo(180, 0)
    expect(separation(c.houses[9].longitude, c.houses[3].longitude)).toBeCloseTo(180, 0)
  })

  it('house 1 cusp equals the Ascendant; house 10 equals the Midheaven', () => {
    const c = calculateWesternChart(j2000)
    expect(c.houses[0].longitude).toBeCloseTo(c.ascendant.longitude, 2)
    expect(c.houses[9].longitude).toBeCloseTo(c.midheaven.longitude, 2)
  })

  it('falls back to equal houses near the pole (Placidus undefined)', () => {
    const polar: BirthData = { ...j2000, name: 'Polar', latitude: 78, city: 'Svalbard' }
    const c = calculateWesternChart(polar)
    expect(c.house_system).toBe('equal')
    // equal: each cusp exactly 30° apart
    const step = ((c.houses[1].longitude - c.houses[0].longitude) % 360 + 360) % 360
    expect(step).toBeCloseTo(30, 4)
  })
})

describe('Aspects', () => {
  it('produces a plausible aspect list with valid orbs', () => {
    const c = calculateWesternChart(j2000)
    expect(c.aspects.length).toBeGreaterThan(0)
    for (const a of c.aspects) {
      expect(a.orb).toBeGreaterThanOrEqual(0)
      expect(a.orb).toBeLessThanOrEqual(8)
      expect(['conjunction','sextile','square','trine','opposition']).toContain(a.type)
      expect(a.a).not.toBe(a.b)
    }
  })

  it('Sun–Mercury are never more than ~28° apart (so only conj possible, if any)', () => {
    const c = calculateWesternChart(j2000)
    const sunMerc = c.aspects.find(
      a => (a.a === 'Sun' && a.b === 'Mercury') || (a.a === 'Mercury' && a.b === 'Sun'),
    )
    if (sunMerc) expect(sunMerc.type).toBe('conjunction')
  })
})

// local helper mirrored from the engine
function separation(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360)
  return d > 180 ? 360 - d : d
}
