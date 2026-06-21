import { describe, it, expect } from 'vitest'
import { computeVibeScore } from './vibe'
import { calculateNatalChart } from './ephemeris'
import type { BirthData } from '@/types'

function makeBirth(date: string, time = '12:00'): BirthData {
  return {
    name: 'Test',
    date,
    time,
    time_unknown: false,
    city: 'London',
    country: 'UK',
    latitude: 51.5,
    longitude: 0,
    timezone: 'UTC',
  }
}

describe('computeVibeScore', () => {
  const a = calculateNatalChart(makeBirth('1990-03-15'))
  const b = calculateNatalChart(makeBirth('1992-07-20'))

  it('returns a score between 5 and 100', () => {
    const r = computeVibeScore(a, b)
    expect(r.score).toBeGreaterThanOrEqual(5)
    expect(r.score).toBeLessThanOrEqual(100)
  })

  it('is symmetric for the Moon distance relationship', () => {
    const ab = computeVibeScore(a, b)
    const ba = computeVibeScore(b, a)
    // Moon angle category is symmetric (d and 14-d normalize to the same class),
    // so the moon label must match in both directions
    expect(ab.moon.label).toBe(ba.moon.label)
  })

  it('identical charts score very high', () => {
    const r = computeVibeScore(a, a)
    expect(r.score).toBeGreaterThanOrEqual(75)
  })

  it('produces highlights and tensions arrays', () => {
    const r = computeVibeScore(a, b)
    expect(Array.isArray(r.highlights)).toBe(true)
    expect(Array.isArray(r.tensions)).toBe(true)
  })
})
