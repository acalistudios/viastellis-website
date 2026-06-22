import { describe, it, expect } from 'vitest'
import { signCuspFlag, nakshatraEdgeFlag } from './boundaryFlags'

describe('signCuspFlag', () => {
  it('flags a longitude just past a sign start as "entering" (neighbor = previous sign)', () => {
    // 0.4° Aries → just entered Aries, neighbor Pisces
    const f = signCuspFlag(0.4)
    expect(f).not.toBeNull()
    expect(f!.edge).toBe('entering')
    expect(f!.neighbor).toBe('Pisces')
    expect(f!.distance).toBeCloseTo(0.4, 2)
  })

  it('flags a longitude near a sign end as "leaving" (neighbor = next sign)', () => {
    // 29.7° Aries → about to enter Taurus
    const f = signCuspFlag(29.7)
    expect(f).not.toBeNull()
    expect(f!.edge).toBe('leaving')
    expect(f!.neighbor).toBe('Taurus')
    expect(f!.distance).toBeCloseTo(0.3, 2)
  })

  it('returns null comfortably inside a sign', () => {
    expect(signCuspFlag(15)).toBeNull()
  })

  it('handles the 360→0 wrap (29.5° Pisces → leaving into Aries)', () => {
    const f = signCuspFlag(359.5)
    expect(f!.edge).toBe('leaving')
    expect(f!.neighbor).toBe('Aries')
  })

  it('respects a custom orb', () => {
    expect(signCuspFlag(28.5, 1)).toBeNull()
    expect(signCuspFlag(28.5, 2)!.neighbor).toBe('Taurus')
  })
})

describe('nakshatraEdgeFlag', () => {
  it('flags the Moon near a nakshatra boundary', () => {
    // First nakshatra (Ashwini) spans 0–13.333°. 13.1° → near its end.
    const f = nakshatraEdgeFlag(13.1)
    expect(f).not.toBeNull()
    expect(f!.neighbor).toBe('Bharani') // next nakshatra
  })

  it('returns null mid-nakshatra', () => {
    expect(nakshatraEdgeFlag(6)).toBeNull()
  })

  it('flags just-entered nakshatra with the previous one as neighbor', () => {
    // 0.2° → just into Ashwini, neighbor is the last nakshatra Revati
    const f = nakshatraEdgeFlag(0.2)
    expect(f!.neighbor).toBe('Revati')
  })
})
