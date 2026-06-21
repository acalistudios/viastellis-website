import { describe, it, expect } from 'vitest'
import {
  calculateVimshottari,
  getAntardashas,
  findCurrentDasha,
  DASHA_SEQUENCE,
} from './dasha'

const YEAR_MS = 365.25 * 86400000
const birth = new Date(Date.UTC(2000, 0, 1, 12))

describe('calculateVimshottari', () => {
  it('sequence durations total 120 years', () => {
    expect(DASHA_SEQUENCE.reduce((s, d) => s + d.years, 0)).toBe(120)
  })

  it('Moon at 0° Ashwini (0° Aries) starts a FULL Ketu dasha of 7 years', () => {
    const periods = calculateVimshottari(0, birth)
    expect(periods[0].lord).toBe('Ketu')
    const years = (periods[0].end.getTime() - periods[0].start.getTime()) / YEAR_MS
    expect(years).toBeCloseTo(7, 5)
    expect(periods[1].lord).toBe('Venus')
  })

  it('Moon halfway through a nakshatra leaves half the first dasha', () => {
    // Halfway through Ashwini = 6°40′ = 6.6667°
    const periods = calculateVimshottari(360 / 27 / 2, birth)
    const years = (periods[0].end.getTime() - periods[0].start.getTime()) / YEAR_MS
    expect(years).toBeCloseTo(3.5, 5)
  })

  it('Moon in Magha (start of second lord cycle) also starts with Ketu', () => {
    // Magha begins at 120° (0° Leo)
    const periods = calculateVimshottari(120, birth)
    expect(periods[0].lord).toBe('Ketu')
  })

  it('Moon in Rohini starts with a Moon dasha', () => {
    // Rohini = 4th nakshatra, spans 40°–53°20′; lord order index 3 = Moon
    const periods = calculateVimshottari(45, birth)
    expect(periods[0].lord).toBe('Moon')
  })

  it('full wheel spans exactly 120 years when starting from a nakshatra boundary', () => {
    const periods = calculateVimshottari(0, birth)
    const total = (periods[8].end.getTime() - periods[0].start.getTime()) / YEAR_MS
    expect(total).toBeCloseTo(120, 4)
    expect(periods).toHaveLength(9)
  })
})

describe('getAntardashas', () => {
  it('antardashas of a full mahadasha sum to its length and start with its own lord', () => {
    const periods = calculateVimshottari(0, birth)
    const venus = periods[1] // full 20y Venus mahadasha
    const antars = getAntardashas(venus)
    expect(antars).toHaveLength(9)
    expect(antars[0].lord).toBe('Venus')
    const sum = antars.reduce((s, a) => s + (a.end.getTime() - a.start.getTime()), 0)
    expect(sum / YEAR_MS).toBeCloseTo(20, 4)
    // Venus–Venus antardasha = 20×20/120 = 3.333 years
    const first = (antars[0].end.getTime() - antars[0].start.getTime()) / YEAR_MS
    expect(first).toBeCloseTo(20 * 20 / 120, 4)
  })

  it('partial first mahadasha clips already-elapsed antardashas', () => {
    // Moon 90% through its nakshatra → only 10% of the dasha remains
    const periods = calculateVimshottari(0.9 * (360 / 27), birth)
    const first = periods[0]
    const antars = getAntardashas(first)
    // Must not start before birth, must end exactly at the mahadasha end
    expect(antars[0].start.getTime()).toBeGreaterThanOrEqual(first.start.getTime())
    expect(antars[antars.length - 1].end.getTime()).toBeCloseTo(first.end.getTime(), -4)
    expect(antars.length).toBeLessThan(9) // some sub-periods elapsed pre-birth
  })
})

describe('findCurrentDasha', () => {
  it('finds the active maha and antar for a date inside the wheel', () => {
    const periods = calculateVimshottari(0, birth)
    // 10 years after birth: Ketu (7y) done → 3 years into Venus
    const probe = new Date(birth.getTime() + 10 * YEAR_MS)
    const current = findCurrentDasha(periods, probe)
    expect(current).not.toBeNull()
    expect(current!.maha.lord).toBe('Venus')
    // 3y into Venus: Venus–Venus runs 3.333y → still Venus antardasha
    expect(current!.antar.lord).toBe('Venus')
  })

  it('returns null outside the 120-year wheel', () => {
    const periods = calculateVimshottari(0, birth)
    expect(findCurrentDasha(periods, new Date(birth.getTime() - YEAR_MS))).toBeNull()
  })
})
