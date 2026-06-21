/**
 * Tests for Batch A: panchanga, navamsa, yogas, sade sati, eclipses, solar return.
 */

import { describe, it, expect } from 'vitest'
import { getPanchanga, upcomingEclipses } from './panchanga'
import { navamsaSign, navamsaChart } from './varga'
import { detectYogas } from './yogas'
import { getSadeSati, nextSolarReturn, saturnSiderealSign } from './cycles'
import { calculateNatalChart, sunSiderealDeg, moonSiderealDeg, norm360 } from './ephemeris'
import type { BirthData } from '@/types'

const testBirth: BirthData = {
  name: 'Test',
  date: '1980-04-14',
  time: '05:45',
  time_unknown: false,
  city: 'Bozeman',
  country: 'United States',
  latitude: 45.68,
  longitude: -111.04,
  timezone: 'America/Denver',
}

describe('panchanga', () => {
  it('returns all five limbs with valid ranges', () => {
    const p = getPanchanga(new Date(Date.UTC(2026, 5, 12, 12)))
    expect(p.tithi.num).toBeGreaterThanOrEqual(1)
    expect(p.tithi.num).toBeLessThanOrEqual(30)
    expect(['Shukla', 'Krishna']).toContain(p.tithi.paksha)
    expect(p.vara.name).toMatch(/vara$/)
    expect(p.yoga.num).toBeGreaterThanOrEqual(1)
    expect(p.yoga.num).toBeLessThanOrEqual(27)
    expect(p.karana.name).toBeTruthy()
    expect(p.moonPhase.illumination).toBeGreaterThanOrEqual(0)
    expect(p.moonPhase.illumination).toBeLessThanOrEqual(100)
  })

  it('tithi is consistent with Sun–Moon elongation', () => {
    const d = new Date(Date.UTC(2026, 0, 15, 6))
    const elong = norm360(moonSiderealDeg(d) - sunSiderealDeg(d))
    const p = getPanchanga(d)
    expect(p.tithi.num).toBe(Math.floor(elong / 12) + 1)
  })

  it('full moon (~180° elongation) reports Purnima territory and high illumination', () => {
    // Scan a month for the day of max elongation near 180°
    let best = new Date(Date.UTC(2026, 0, 1))
    let bestDist = 999
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.UTC(2026, 0, 1 + i, 0))
      const e = norm360(moonSiderealDeg(d) - sunSiderealDeg(d))
      if (Math.abs(e - 180) < bestDist) { bestDist = Math.abs(e - 180); best = d }
    }
    const p = getPanchanga(best)
    expect(p.moonPhase.illumination).toBeGreaterThan(90)
    expect([14, 15, 16]).toContain(p.tithi.num)
  })
})

describe('eclipses', () => {
  it('finds at least two eclipses in any 14-month window', () => {
    // Astronomy guarantees ≥2 solar eclipses per calendar year
    const events = upcomingEclipses(new Date(Date.UTC(2026, 5, 1)), 14)
    expect(events.length).toBeGreaterThanOrEqual(2)
    for (const e of events) {
      expect(['solar', 'lunar']).toContain(e.kind)
      expect(e.date.getTime()).toBeGreaterThan(Date.UTC(2026, 4, 30))
    }
    // Sorted ascending
    for (let i = 1; i < events.length; i++) {
      expect(events[i].date.getTime()).toBeGreaterThanOrEqual(events[i - 1].date.getTime())
    }
  })
})

describe('navamsa', () => {
  it('matches the classical anchor cases', () => {
    expect(navamsaSign(0)).toBe('Aries')        // 0° Aries → Aries (movable: from itself)
    expect(navamsaSign(30)).toBe('Capricorn')   // 0° Taurus → Capricorn (fixed: from 9th)
    expect(navamsaSign(60)).toBe('Libra')       // 0° Gemini → Libra (dual: from 5th)
    expect(navamsaSign(29.99)).toBe('Sagittarius') // last navamsa of Aries
  })

  it('vargottama: last navamsa of a dual sign equals the sign itself', () => {
    // Pisces 26°40′–30° is Pisces navamsa (classic vargottama)
    expect(navamsaSign(330 + 28)).toBe('Pisces')
  })

  it('builds a D9 chart with 9 planets and valid houses', () => {
    const d9 = navamsaChart(calculateNatalChart(testBirth))
    expect(d9.planets).toHaveLength(9)
    expect(d9.lagnaSign).not.toBeNull()
    for (const p of d9.planets) {
      expect(p.house).toBeGreaterThanOrEqual(1)
      expect(p.house).toBeLessThanOrEqual(12)
    }
  })
})

describe('yogas', () => {
  const chart = calculateNatalChart(testBirth)
  const yogas = detectYogas(chart)

  it('returns a list of named yogas with descriptions', () => {
    for (const y of yogas) {
      expect(y.name).toBeTruthy()
      expect(y.description.length).toBeGreaterThan(20)
    }
  })

  it('moon-adjacency yogas are mutually exclusive', () => {
    const names = yogas.map(y => y.name)
    const moonYogas = ['Sunapha Yoga', 'Anapha Yoga', 'Durudhara Yoga', 'Kemadruma Yoga']
    expect(names.filter(n => moonYogas.includes(n)).length).toBeLessThanOrEqual(1)
  })

  it('detects Budhaditya when Sun and Mercury share a sign (synthetic check)', () => {
    // Find any date where Sun & Mercury are in the same sidereal sign
    const c = calculateNatalChart({ ...testBirth, date: '1990-01-10' })
    const sun = c.planets.find(p => p.planet === 'Sun')!
    const mercury = c.planets.find(p => p.planet === 'Mercury')!
    const ys = detectYogas(c).map(y => y.name)
    expect(ys.includes('Budhaditya Yoga')).toBe(sun.sign === mercury.sign)
  })
})

describe('sade sati', () => {
  it('reports a coherent status with valid window', () => {
    const s = getSadeSati('Pisces', new Date(Date.UTC(2026, 5, 12)))
    expect(s.houseFromMoon).toBeGreaterThanOrEqual(1)
    expect(s.houseFromMoon).toBeLessThanOrEqual(12)
    expect(s.since.getTime()).toBeLessThan(s.until.getTime())
    expect(s.active).toBe([12, 1, 2].includes(s.houseFromMoon))
    // Saturn stays in a sign ~2.5 years; window must be plausible (1–4 years)
    const years = (s.until.getTime() - s.since.getTime()) / (365.25 * 86400000)
    expect(years).toBeGreaterThan(0.5)
    expect(years).toBeLessThan(4.5)
  })

  it('sign window boundaries actually bracket a sign change', () => {
    const now = new Date(Date.UTC(2026, 5, 12))
    const s = getSadeSati('Aries', now)
    const signNow = saturnSiderealSign(now)
    expect(saturnSiderealSign(new Date(s.since.getTime() - 3 * 86400000))).not.toBe(signNow)
    expect(saturnSiderealSign(new Date(s.until.getTime() + 3 * 86400000))).not.toBe(signNow)
  })
})

describe('solar return', () => {
  it('the Sun is at its natal longitude at the returned instant', () => {
    const chart = calculateNatalChart(testBirth)
    const sun = chart.planets.find(p => p.planet === 'Sun')!
    const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
    const natalSunDeg = SIGNS.indexOf(sun.sign) * 30 + sun.degree

    const sr = nextSolarReturn(natalSunDeg, testBirth.latitude, testBirth.longitude, new Date(Date.UTC(2026, 5, 12)))
    let d = norm360(natalSunDeg - sunSiderealDeg(sr.instant))
    if (d > 180) d -= 360
    expect(Math.abs(d)).toBeLessThan(0.01) // within ~15 minutes of arc-time

    // Must land near the birthday (mid-April), within a couple of days
    expect([2, 3]).toContain(sr.instant.getUTCMonth()) // March or April (sidereal drift)
  })
})
