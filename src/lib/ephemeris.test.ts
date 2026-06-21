/**
 * Runtime validation of the ephemeris engine.
 *
 * Reference: January 1, 2000, 12:00 TT (noon), London (51.5°N, 0°E).
 * Expected tropical Sun at J2000.0: ~280.46° (Capricorn 10.46°)
 * Lahiri ayanamsa at J2000.0: ~23.85°
 * Expected sidereal Sun: ~256.6° (Sagittarius ~16.6°)
 *
 * Secondary reference: April 7, 1954 (Vedic chart used in many textbooks):
 * Sun in Pisces (sidereal), Moon in Taurus — used for sign-level sanity check.
 */

import { describe, it, expect } from 'vitest'
import {
  birthDataToJde,
  lahiriAyanamsa,
  calculateNatalChart,
  calculateAscendant,
  dateToJde,
  getTransitSnapshot,
  moonSiderealDeg,
  moonGocharaQuality,
} from './ephemeris'
import type { BirthData } from '@/types'

// Reference birth data — J2000.0 epoch (noon UTC Jan 1 2000, London)
const j2000BirthData: BirthData = {
  name: 'J2000 Reference',
  date: '2000-01-01',
  time: '12:00',
  time_unknown: false,
  city: 'London',
  country: 'United Kingdom',
  latitude: 51.5,
  longitude: 0.0,
  timezone: 'Europe/London',
}

describe('birthDataToJde', () => {
  it('converts J2000.0 noon UTC to JDE 2451545.0', () => {
    const jde = birthDataToJde('2000-01-01', '12:00', 'UTC')
    // J2000.0 = JDE 2451545.0 exactly
    expect(jde).toBeCloseTo(2451545.0, 1)
  })

  it('handles timezone offset (IST = UTC+5:30)', () => {
    // 12:00 IST = 06:30 UTC → JDE 2451545.0 - 0.2292 days ≈ 2451544.771
    const jde = birthDataToJde('2000-01-01', '12:00', 'Asia/Kolkata')
    expect(jde).toBeCloseTo(2451545.0 - 5.5 / 24, 2)
  })
})

describe('lahiriAyanamsa', () => {
  it('returns ~23.85° at J2000.0', () => {
    const ayanamsa = lahiriAyanamsa(2451545.0)
    expect(ayanamsa).toBeGreaterThan(23.5)
    expect(ayanamsa).toBeLessThan(24.2)
  })
})

describe('calculateNatalChart', () => {
  it('places Sun in Sagittarius for J2000.0 (tropical Capricorn - ayanamsa)', () => {
    const chart = calculateNatalChart(j2000BirthData)
    const sun = chart.planets.find(p => p.planet === 'Sun')!
    // Tropical ~280.46°, ayanamsa ~23.85° → sidereal ~256.6° → Sagittarius
    expect(sun.sign).toBe('Sagittarius')
    expect(sun.degree).toBeGreaterThan(10)
    expect(sun.degree).toBeLessThan(22)
  })

  it('places Moon in a valid sign', () => {
    const chart = calculateNatalChart(j2000BirthData)
    const moon = chart.planets.find(p => p.planet === 'Moon')!
    const SIGNS = [
      'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
      'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
    ]
    expect(SIGNS).toContain(moon.sign)
    expect(moon.degree).toBeGreaterThanOrEqual(0)
    expect(moon.degree).toBeLessThan(30)
  })

  it('Rahu and Ketu are exactly 180° apart', () => {
    const chart = calculateNatalChart(j2000BirthData)
    const rahu = chart.planets.find(p => p.planet === 'Rahu')!
    const ketu = chart.planets.find(p => p.planet === 'Ketu')!
    const rahuDeg = SIGNS.indexOf(rahu.sign) * 30 + rahu.degree
    const ketuDeg = SIGNS.indexOf(ketu.sign) * 30 + ketu.degree
    const diff = Math.abs(rahuDeg - ketuDeg)
    expect(Math.min(diff, 360 - diff)).toBeCloseTo(180, 0)
  })

  it('returns exactly 9 planetary bodies plus Ascendant', () => {
    const chart = calculateNatalChart(j2000BirthData)
    expect(chart.planets).toHaveLength(10)  // 9 grahas + Ascendant
  })

  it('returns 12 houses in Whole Sign', () => {
    const chart = calculateNatalChart(j2000BirthData)
    expect(chart.houses).toHaveLength(12)
    chart.houses.forEach(h => expect(h.degree).toBe(0))  // Whole Sign: all cusps at 0°
  })

  it('uses Lahiri ayanamsa label', () => {
    const chart = calculateNatalChart(j2000BirthData)
    expect(chart.ayanamsa).toBe('Lahiri')
  })

  it('all nakshatra_pada values are 1–4', () => {
    const chart = calculateNatalChart(j2000BirthData)
    chart.planets.forEach(p => {
      expect(p.nakshatra_pada).toBeGreaterThanOrEqual(1)
      expect(p.nakshatra_pada).toBeLessThanOrEqual(4)
    })
  })
})

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
]

describe('calculateAscendant', () => {
  it('sunrise birth puts the Sun on or near the Ascendant (1st house)', () => {
    // Equinox sunrise at the equator: 2000-03-20 ~06:00 UTC at lon 0, lat 0.
    // The Sun rises exactly at the Ascendant — both ~0° tropical Aries.
    const chart = calculateNatalChart({
      name: 'Sunrise',
      date: '2000-03-20',
      time: '06:00',
      time_unknown: false,
      city: 'Gulf of Guinea',
      country: '—',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    })
    const sun = chart.planets.find(p => p.planet === 'Sun')!
    // Sidereal: both Sun and Asc ≈ 5–6° Pisces. Sun must be in house 1 or 12
    // (just below/above the horizon), never house 7.
    expect([1, 12]).toContain(sun.house)
    expect(chart.ascendant.sign).toBe(sun.sign)
  })

  it('regression: 1980-04-14 05:45 Bozeman MT — pre-dawn Sun in 1st house, Aries lagna', () => {
    const chart = calculateNatalChart({
      name: 'Hans',
      date: '1980-04-14',
      time: '05:45',
      time_unknown: false,
      city: 'Bozeman',
      country: 'United States',
      latitude: 45.68,
      longitude: -111.04,
      timezone: 'America/Denver',
    })
    const sun = chart.planets.find(p => p.planet === 'Sun')!
    expect(sun.sign).toBe('Aries')        // sidereal ~1° Aries, Ashwini
    expect(chart.ascendant.sign).not.toBe('Libra') // the exact bug we fixed
    // ~45 min before sunrise: Sun sits just under the eastern horizon → house 1 or 12
    expect([1, 12]).toContain(sun.house)
  })

  it('ascendant degree is within 0–360 and varies with time', () => {
    const jde = 2451545.0
    const a1 = calculateAscendant(jde, 45, 0)
    const a2 = calculateAscendant(jde + 0.25, 45, 0) // +6 hours ≈ +~90° of sky rotation
    expect(a1).toBeGreaterThanOrEqual(0)
    expect(a1).toBeLessThan(360)
    expect(Math.abs(a2 - a1)).toBeGreaterThan(30)
  })
})

describe('transits', () => {
  it('dateToJde matches J2000.0', () => {
    const jde = dateToJde(new Date(Date.UTC(2000, 0, 1, 12, 0, 0)))
    expect(jde).toBeCloseTo(2451545.0, 6)
  })

  it('getTransitSnapshot returns all 9 grahas', () => {
    const snapshot = getTransitSnapshot(new Date(Date.UTC(2000, 0, 1, 12)))
    expect(snapshot).toHaveLength(9)
    const sun = snapshot.find(p => p.planet === 'Sun')!
    expect(sun.sign).toBe('Sagittarius') // sidereal Sun at J2000.0
  })

  it('moonSiderealDeg matches the snapshot Moon', () => {
    const date = new Date(Date.UTC(2000, 0, 1, 12))
    const deg = moonSiderealDeg(date)
    const moon = getTransitSnapshot(date).find(p => p.planet === 'Moon')!
    const reconstructed = SIGNS.indexOf(moon.sign) * 30 + moon.degree
    expect(deg).toBeCloseTo(reconstructed, 1)
  })

  it('moonGocharaQuality: same sign = house 1 = favorable', () => {
    const r = moonGocharaQuality('Aries', 'Aries')
    expect(r.houseFromMoon).toBe(1)
    expect(r.quality).toBe('favorable')
    expect(r.isChandrashtama).toBe(false)
  })

  it('moonGocharaQuality: 8th house = chandrashtama = challenging', () => {
    const r = moonGocharaQuality('Aries', 'Scorpio') // Aries→Scorpio = 8th
    expect(r.houseFromMoon).toBe(8)
    expect(r.quality).toBe('challenging')
    expect(r.isChandrashtama).toBe(true)
  })

  it('moonGocharaQuality: 5th house = neutral', () => {
    const r = moonGocharaQuality('Cancer', 'Scorpio') // Cancer→Scorpio = 5th
    expect(r.houseFromMoon).toBe(5)
    expect(r.quality).toBe('neutral')
  })
})
