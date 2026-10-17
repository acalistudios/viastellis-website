import { describe, it, expect } from 'vitest'
import { defaultHoroscopeLens, getDayQuality, lensSystem } from './dayQuality'
import { moonSiderealDeg, moonTropicalDeg, signFromDeg, ZODIAC_SIGNS, calculateNatalChart } from './ephemeris'
import { westernSunSign } from './westernSign'
import type { NatalChart, ZodiacSign } from '@/types'

const NOW = new Date('2026-10-17T12:00:00Z')

// A mid-sign birth date for each tropical Sun sign.
const MID_SIGN_DATE: Record<ZodiacSign, string> = {
  Aries: '1990-04-05', Taurus: '1990-05-05', Gemini: '1990-06-05', Cancer: '1990-07-07',
  Leo: '1990-08-07', Virgo: '1990-09-07', Libra: '1990-10-07', Scorpio: '1990-11-07',
  Sagittarius: '1990-12-07', Capricorn: '1990-01-05', Aquarius: '1990-02-05', Pisces: '1990-03-05',
}

/** Western mood only reads birth_data.date, so a minimal chart is enough. */
const westernChart = (sun: ZodiacSign) => ({ birth_data: { date: MID_SIGN_DATE[sun] } }) as unknown as NatalChart

const signAt = (offset: number, from: ZodiacSign) =>
  ZODIAC_SIGNS[(ZODIAC_SIGNS.indexOf(from) + offset + 12) % 12] as ZodiacSign

describe('lens → system', () => {
  it('maps Vedic lenses to vedic and Sun-sign lenses to western', () => {
    expect(lensSystem('vedic_moon')).toBe('vedic')
    expect(lensSystem('personalized')).toBe('vedic')
    for (const l of ['western_sun', 'love', 'career', 'money'] as const) expect(lensSystem(l)).toBe('western')
  })

  it('defaults to western_sun and maps the retired vedic_sun to vedic_moon', () => {
    expect(defaultHoroscopeLens(null)).toBe('western_sun')
    expect(defaultHoroscopeLens({ default_horoscope_lens: 'vedic_sun' })).toBe('vedic_moon')
    expect(defaultHoroscopeLens({ default_horoscope_lens: 'vedic_moon' })).toBe('vedic_moon')
  })
})

describe('tropical vs sidereal Moon', () => {
  it('differs by roughly the Lahiri ayanamsa (~24°)', () => {
    const diff = (moonTropicalDeg(NOW) - moonSiderealDeg(NOW) + 360) % 360
    expect(diff).toBeGreaterThan(23.5)
    expect(diff).toBeLessThan(24.8)
  })
})

describe('western day quality', () => {
  const moon = signFromDeg(moonTropicalDeg(NOW)) as ZodiacSign

  it('uses the tropical Moon sign, not the sidereal one', () => {
    expect(getDayQuality(westernChart('Aries'), 'western', NOW).transitMoonSign).toBe(moon)
  })

  it('reads the Moon in, sextile or trine the Sun sign as flowing', () => {
    // Pick the Sun sign so that the Moon lands at each harmonious distance.
    for (const dist of [0, 2, 4, 8, 10]) {
      const sun = signAt(-dist, moon)
      expect(westernSunSign(MID_SIGN_DATE[sun])).toBe(sun)
      expect(getDayQuality(westernChart(sun), 'western', NOW).quality, `distance ${dist}`).toBe('favorable')
    }
  })

  it('reads square and opposition as tender, and only the opposition as a rest day', () => {
    for (const dist of [3, 9]) {
      const q = getDayQuality(westernChart(signAt(-dist, moon)), 'western', NOW)
      expect(q.quality).toBe('challenging')
      expect(q.restDay).toBe(false)
    }
    const opp = getDayQuality(westernChart(signAt(-6, moon)), 'western', NOW)
    expect(opp.quality).toBe('challenging')
    expect(opp.restDay).toBe(true)
  })

  it('reads semi-sextile and quincunx as steady', () => {
    for (const dist of [1, 11, 5, 7]) {
      expect(getDayQuality(westernChart(signAt(-dist, moon)), 'western', NOW).quality).toBe('neutral')
    }
  })
})

describe('vedic day quality', () => {
  it('uses the sidereal Moon and the natal-Moon gochara rule', () => {
    const chart = calculateNatalChart({
      name: 'Test', date: '1990-06-15', time: '12:00', time_unknown: false,
      city: 'New York', country: 'United States',
      latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York',
    })
    const q = getDayQuality(chart, 'vedic', NOW)
    expect(q.transitMoonSign).toBe(signFromDeg(moonSiderealDeg(NOW)))
    expect(q.basis).toContain('natal Moon')
  })
})
