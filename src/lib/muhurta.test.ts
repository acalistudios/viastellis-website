import { describe, it, expect } from 'vitest'
import { getTara, scoreUpcomingDays, bestDays } from './muhurta'

describe('getTara', () => {
  it('same nakshatra = Janma (tara 1)', () => {
    const t = getTara(0, 0)
    expect(t.num).toBe(1)
    expect(t.name).toBe('Janma')
  })

  it('next nakshatra = Sampat (tara 2, good)', () => {
    const t = getTara(0, 1)
    expect(t.name).toBe('Sampat')
    expect(t.good).toBe(true)
  })

  it('7th from natal = Naidhana (the classical avoid)', () => {
    const t = getTara(0, 6)
    expect(t.name).toBe('Naidhana')
    expect(t.good).toBe(false)
  })

  it('cycle repeats every 9: 10th nakshatra is Janma again', () => {
    expect(getTara(0, 9).name).toBe('Janma')
    expect(getTara(0, 18).name).toBe('Janma')
  })

  it('wraps around the 27-nakshatra circle', () => {
    // Natal at Revati (26), transit at Ashwini (0): count = 2 → Sampat
    expect(getTara(26, 0).name).toBe('Sampat')
  })
})

describe('scoreUpcomingDays', () => {
  const scores = scoreUpcomingDays(0, 30, new Date(Date.UTC(2026, 5, 10)))

  it('returns one entry per day, all scored 0–100', () => {
    expect(scores).toHaveLength(30)
    for (const s of scores) {
      expect(s.score).toBeGreaterThanOrEqual(0)
      expect(s.score).toBeLessThanOrEqual(100)
      expect(s.nakshatra).toBeTruthy()
    }
  })

  it('contains a spread of good and bad days over a month', () => {
    // The Moon crosses all 27 nakshatras in ~27.3 days, so a 30-day window
    // must contain both clearly good (≥70) and clearly cautious (≤35) days
    expect(scores.some(s => s.score >= 70)).toBe(true)
    expect(scores.some(s => s.score <= 35)).toBe(true)
  })

  it('chandrashtama days are scored low', () => {
    const chandrashtama = scores.filter(s => s.isChandrashtama)
    for (const s of chandrashtama) {
      expect(s.score).toBeLessThan(70)
    }
  })
})

describe('bestDays', () => {
  it('returns the top N sorted by score descending', () => {
    const scores = scoreUpcomingDays(100, 30, new Date(Date.UTC(2026, 5, 10)))
    const top = bestDays(scores, 5)
    expect(top).toHaveLength(5)
    for (let i = 1; i < top.length; i++) {
      expect(top[i].score).toBeLessThanOrEqual(top[i - 1].score)
    }
    expect(top[0].score).toBe(Math.max(...scores.map(s => s.score)))
  })
})
