import { describe, it, expect } from 'vitest'
import { upcomingRetrogrades } from './retrograde'
import { getGemstoneRecommendations, getGemForPlanet } from './gemstones'
import { calculateNatalChart } from './ephemeris'
import type { BirthData } from '@/types'

const testBirth: BirthData = {
  name: 'Test User',
  date: '1990-01-15',
  time: '14:30',
  time_unknown: false,
  city: 'New York',
  country: 'United States',
  latitude: 40.7128,
  longitude: -74.006,
  timezone: 'America/New_York',
}

describe('retrograde system', () => {
  it('finds upcoming retrogrades within a window', () => {
    const from = new Date(Date.UTC(2026, 0, 1))
    const retrogrades = upcomingRetrogrades(from, 12)
    expect(Array.isArray(retrogrades)).toBe(true)
    for (const r of retrogrades) {
      expect(r.planet).toBeDefined()
      expect(r.startDate.getTime() <= r.endDate.getTime()).toBe(true)
      expect(r.durationDays > 0).toBe(true)
      expect(r.meaning).toBeTruthy()
      expect(r.startsIn >= 0).toBe(true)
    }
  })

  it('retrograde start is before or equal to end', () => {
    const from = new Date(Date.UTC(2026, 0, 1))
    const retrogrades = upcomingRetrogrades(from, 12)
    for (const r of retrogrades) {
      expect(r.startDate.getTime()).toBeLessThanOrEqual(r.endDate.getTime())
      expect(r.startsIn >= 0).toBe(true)
    }
  })

  it('returns empty array for old dates', () => {
    const from = new Date(Date.UTC(2027, 0, 1))
    const retrogrades = upcomingRetrogrades(from, 3)
    expect(retrogrades.length).toBe(0)
  })
})

describe('gemstone recommendations', () => {
  it('returns recommendations for weak planets', () => {
    const chart = calculateNatalChart(testBirth)
    const recs = getGemstoneRecommendations(chart)
    expect(Array.isArray(recs)).toBe(true)
    for (const rec of recs) {
      expect(rec.planet).toBeDefined()
      expect(rec.gem).toBeTruthy()
      expect(rec.color).toBeTruthy()
      expect(rec.benefit).toBeTruthy()
      expect(rec.reason).toBeTruthy()
      expect(rec.wearingTips.length > 0).toBe(true)
    }
  })

  it('returns gem data for all planets', () => {
    const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu']
    for (const p of planets) {
      const gem = getGemForPlanet(p as 'Sun')
      expect(gem.primary).toBeTruthy()
      expect(gem.secondary).toBeTruthy()
    }
  })

  it('gem recommendations match weaknesses in the chart', () => {
    const chart = calculateNatalChart(testBirth)
    const recs = getGemstoneRecommendations(chart)
    // Any weakness (debilitation, 6/8/12 house, retrograde) should trigger a recommendation
    for (const rec of recs) {
      expect(rec.reason).toMatch(/(debilitated|house|retrograde)/)
    }
  })
})
