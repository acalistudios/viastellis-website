/**
 * Panchanga — the five limbs of the Vedic day (feature #1), plus
 * Western moon phase and an eclipse finder (feature #5).
 *
 *  - Tithi:  lunar day = Moon−Sun elongation / 12° (30 per month, two pakshas)
 *  - Vara:   weekday with its planetary lord
 *  - Nakshatra: Moon's lunar mansion (already in ephemeris.ts)
 *  - Yoga:   (sidereal Sun + sidereal Moon) / 13°20′ — 27 yogas
 *  - Karana: half-tithi = elongation / 6° — 60 per month, 11 names
 *
 * Tithi/karana use elongation, so the ayanamsa cancels; yoga uses sidereal
 * longitudes per standard nirayana practice.
 */

import { eclipse, moonphase } from 'astronomia'
import { moonSiderealDeg, sunSiderealDeg, norm360 } from './ephemeris'

// ─── Names ────────────────────────────────────────────────────────────────────

const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
]

const VARA = [
  { name: 'Ravivara',    lord: 'Sun' },
  { name: 'Somavara',    lord: 'Moon' },
  { name: 'Mangalavara', lord: 'Mars' },
  { name: 'Budhavara',   lord: 'Mercury' },
  { name: 'Guruvara',    lord: 'Jupiter' },
  { name: 'Shukravara',  lord: 'Venus' },
  { name: 'Shanivara',   lord: 'Saturn' },
]

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarman', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyana', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Indra', 'Vaidhriti',
]

const MOVABLE_KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti']

// ─── Panchanga ────────────────────────────────────────────────────────────────

export interface Panchanga {
  tithi: { num: number; name: string; paksha: 'Shukla' | 'Krishna' }
  vara: { name: string; lord: string }
  yoga: { num: number; name: string }
  karana: { name: string }
  moonPhase: { name: string; illumination: number; emoji: string }
}

export function getPanchanga(date: Date): Panchanga {
  const sun = sunSiderealDeg(date)
  const moon = moonSiderealDeg(date)
  const elongation = norm360(moon - sun)

  // Tithi (1–30)
  const tithiNum = Math.floor(elongation / 12) + 1
  const paksha: 'Shukla' | 'Krishna' = tithiNum <= 15 ? 'Shukla' : 'Krishna'
  const tithiName =
    tithiNum === 15 ? 'Purnima'
      : tithiNum === 30 ? 'Amavasya'
      : TITHI_NAMES[(tithiNum - 1) % 15]

  // Vara (local weekday)
  const vara = VARA[date.getDay()]

  // Yoga (sidereal Sun + Moon)
  const yogaNum = Math.floor(norm360(sun + moon) / (360 / 27)) + 1

  // Karana (half-tithi, 0–59)
  const k = Math.floor(elongation / 6)
  const karanaName =
    k === 0 ? 'Kimstughna'
      : k >= 57 ? ['Shakuni', 'Chatushpada', 'Naga'][k - 57]
      : MOVABLE_KARANAS[(k - 1) % 7]

  // Moon phase (Western)
  const illumination = (1 - Math.cos(elongation * Math.PI / 180)) / 2
  const octant = Math.round(elongation / 45) % 8
  const PHASES = [
    { name: 'New Moon',        emoji: '🌑' },
    { name: 'Waxing Crescent', emoji: '🌒' },
    { name: 'First Quarter',   emoji: '🌓' },
    { name: 'Waxing Gibbous',  emoji: '🌔' },
    { name: 'Full Moon',       emoji: '🌕' },
    { name: 'Waning Gibbous',  emoji: '🌖' },
    { name: 'Last Quarter',    emoji: '🌗' },
    { name: 'Waning Crescent', emoji: '🌘' },
  ]

  return {
    tithi: { num: tithiNum, name: tithiName, paksha },
    vara,
    yoga: { num: yogaNum, name: YOGA_NAMES[yogaNum - 1] },
    karana: { name: karanaName },
    moonPhase: { ...PHASES[octant], illumination: Math.round(illumination * 100) },
  }
}

// ─── Eclipses ─────────────────────────────────────────────────────────────────

export interface EclipseEvent {
  kind: 'solar' | 'lunar'
  type: string
  date: Date
}

const SOLAR_TYPES: Record<number, string> = {
  1: 'Partial', 2: 'Annular', 3: 'Annular-Total', 6: 'Total',
}
const LUNAR_TYPES: Record<number, string> = {
  4: 'Penumbral', 5: 'Partial (umbral)', 6: 'Total',
}

function jdeToDate(jde: number): Date {
  return new Date((jde - 2440587.5) * 86400000)
}

/** Upcoming solar & lunar eclipses within ~monthsAhead, sorted by date. */
export function upcomingEclipses(from: Date = new Date(), monthsAhead = 14): EclipseEvent[] {
  const events: EclipseEvent[] = []
  const seen = new Set<string>()

  const startYear =
    from.getFullYear() +
    (from.getTime() - Date.UTC(from.getFullYear(), 0, 1)) / (365.25 * 86400000)
  const lunationYears = 29.530588861 / 365.25
  const steps = Math.ceil((monthsAhead * 30.44) / 29.53) + 1

  for (let i = 0; i < steps; i++) {
    const y = startYear + i * lunationYears

    const s = eclipse.solar(y)
    if (s.type !== eclipse.TYPE.None) {
      const d = jdeToDate(s.jdeMax)
      const key = `solar-${d.toISOString().slice(0, 10)}`
      if (!seen.has(key) && d >= from) {
        seen.add(key)
        events.push({ kind: 'solar', type: SOLAR_TYPES[s.type] ?? 'Eclipse', date: d })
      }
    }

    const l = eclipse.lunar(y)
    if (l.type !== eclipse.TYPE.None) {
      const d = jdeToDate(l.jdeMax)
      const key = `lunar-${d.toISOString().slice(0, 10)}`
      if (!seen.has(key) && d >= from) {
        seen.add(key)
        events.push({ kind: 'lunar', type: LUNAR_TYPES[l.type] ?? 'Eclipse', date: d })
      }
    }
  }

  const cutoff = new Date(from.getTime() + monthsAhead * 30.44 * 86400000)
  return events
    .filter(e => e.date <= cutoff)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

export { moonphase }
