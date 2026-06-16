/**
 * Vedic ephemeris engine — Task 5
 *
 * Calculations:
 *  - Planetary longitudes via VSOP87B theory (astronomia package)
 *  - Lunar position via ELP2000-85 truncated series
 *  - Lahiri (Chitrapaksha) ayanamsa applied to convert tropical → sidereal
 *  - Rahu/Ketu from mean lunar node
 *  - Ascendant from Local Sidereal Time (when birth time is known)
 *  - Whole Sign houses (standard for Vedic/Jyotish)
 *  - Nakshatra + pada from sidereal longitude
 *  - Retrograde detection by comparing JDE±0.5 day positions
 *
 * Accuracy: ~0.01–0.1° for dates 1800–2100. Sufficient for sign/nakshatra placement.
 * Note: light-time correction is omitted (≤0.02° effect on slow planets).
 */

import { CalendarGregorianToJD } from 'astronomia/julian'
import { trueVSOP87 } from 'astronomia/solar'
import { position as moonPosition, node as moonNode } from 'astronomia/moonposition'
import { Planet } from 'astronomia/planetposition'
import { meanObliquity } from 'astronomia/nutation'

import earthData from 'astronomia/data/vsop87Bearth'
import mercuryData from 'astronomia/data/vsop87Bmercury'
import venusData from 'astronomia/data/vsop87Bvenus'
import marsData from 'astronomia/data/vsop87Bmars'
import jupiterData from 'astronomia/data/vsop87Bjupiter'
import saturnData from 'astronomia/data/vsop87Bsaturn'

import type { BirthData, NatalChart, PlanetPosition, ZodiacSign, Planet as PlanetName } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const RAD2DEG = 180 / Math.PI
const DEG2RAD = Math.PI / 180

const ZODIAC_SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha',
  'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
]

// Pre-instantiate planets (expensive to recreate per call)
const earthPlanet = new Planet(earthData)
const mercuryPlanet = new Planet(mercuryData)
const venusPlanet = new Planet(venusData)
const marsPlanet = new Planet(marsData)
const jupiterPlanet = new Planet(jupiterData)
const saturnPlanet = new Planet(saturnData)

// ─── Date/Time Utilities ──────────────────────────────────────────────────────

/**
 * Converts a birth date (YYYY-MM-DD), time (HH:MM), and IANA timezone
 * to a Julian Ephemeris Day number (JDE ≈ JD for our purposes).
 *
 * Strategy: use Intl to find the UTC offset for that timezone at that moment,
 * then correct for it to get true UTC, then to JDE.
 */
export function birthDataToJde(
  dateStr: string,
  timeStr: string | null,
  timezone: string
): number {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr ? timeStr.split(':').map(Number) : [12, 0]

  // Treat the local birth time as UTC to get a reference Date
  const fakeUtc = new Date(Date.UTC(y, mo - 1, d, hh, mm, 0))

  // Ask Intl what local date/time that UTC maps to in the birth timezone
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(fakeUtc).map(p => [p.type, p.value]))
  const localHour = parts.hour === '24' ? 0 : parseInt(parts.hour)
  const localMs = Date.UTC(
    parseInt(parts.year), parseInt(parts.month) - 1, parseInt(parts.day),
    localHour, parseInt(parts.minute), parseInt(parts.second)
  )

  // UTC offset = local time (as ms) – UTC time (as ms)
  const offsetMs = localMs - fakeUtc.getTime()

  // True UTC = our local birth time – offset
  const utcMs = fakeUtc.getTime() - offsetMs
  const utc = new Date(utcMs)

  // Convert UTC to fractional Julian Day
  const jd = CalendarGregorianToJD(
    utc.getUTCFullYear(),
    utc.getUTCMonth() + 1,
    utc.getUTCDate() + (utc.getUTCHours() + utc.getUTCMinutes() / 60 + utc.getUTCSeconds() / 3600) / 24
  )
  return jd
}

// ─── Ayanamsa ─────────────────────────────────────────────────────────────────

/**
 * Lahiri (Chitrapaksha) ayanamsa in degrees.
 *
 * Based on IAU 1976 precession. Accurate to ~0.01° for 1800–2100.
 * Reference: Indian Astronomical Ephemeris; validated against Jagannatha Hora.
 *
 *   At J2000.0 (JDE 2451545.0): 23.8527°
 *   Annual increase: 50.27972" = 0.013967°/year
 */
export function lahiriAyanamsa(jde: number): number {
  const T = (jde - 2451545.0) / 36525.0  // Julian centuries from J2000.0
  return 23.8527 + T * (50.27972 / 3600) * 100
  // T * 100 = years from J2000.0
}

// ─── Coordinate Utilities ─────────────────────────────────────────────────────

function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function radToDeg(rad: number): number {
  return norm360(rad * RAD2DEG)
}

/**
 * Converts heliocentric (L, B, R) to geocentric rectangular {x, y, z}.
 */
function helioToRect(lon: number, lat: number, r: number) {
  const cosB = Math.cos(lat)
  return {
    x: r * cosB * Math.cos(lon),
    y: r * cosB * Math.sin(lon),
    z: r * Math.sin(lat),
  }
}

/**
 * Geocentric ecliptic longitude of a planet (tropical, in degrees).
 * Uses the planet's heliocentric VSOP87 coords minus Earth's.
 */
function geoEclipticLon(
  planet: Planet,
  earth: Planet,
  jde: number
): number {
  const p = planet.position(jde)
  const e = earth.position(jde)

  const pRect = helioToRect(p.lon, p.lat, p.range)
  const eRect = helioToRect(e.lon, e.lat, e.range)

  const dx = pRect.x - eRect.x
  const dy = pRect.y - eRect.y

  return norm360(Math.atan2(dy, dx) * RAD2DEG)
}

// ─── Nakshatra ────────────────────────────────────────────────────────────────

function getNakshatra(siderealDeg: number): { name: string; pada: number } {
  // Each nakshatra = 360/27 = 13.333...°, each pada = 3.333...°
  const idx = Math.floor(siderealDeg / (360 / 27)) % 27
  const posInNak = siderealDeg % (360 / 27)
  const pada = Math.floor(posInNak / (360 / 108)) + 1  // 360/108 = 3.333...°
  return { name: NAKSHATRAS[idx], pada: Math.min(pada, 4) }
}

// ─── Sign & Degree ────────────────────────────────────────────────────────────

function signFromDeg(siderealDeg: number): ZodiacSign {
  return ZODIAC_SIGNS[Math.floor(siderealDeg / 30) % 12]
}

function degreeInSign(siderealDeg: number): number {
  return siderealDeg % 30
}

// ─── Retrograde Detection ─────────────────────────────────────────────────────

/**
 * A planet is retrograde when its geocentric longitude is decreasing.
 * We compare positions 0.5 day before and after — good enough for all planets.
 */
function isRetrograde(
  planet: Planet,
  earth: Planet,
  jde: number
): boolean {
  const before = geoEclipticLon(planet, earth, jde - 0.5)
  const after = geoEclipticLon(planet, earth, jde + 0.5)

  // Handle wrap-around (e.g., 359° → 1°)
  let delta = after - before
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return delta < 0
}

// ─── Ascendant (Lagna) ────────────────────────────────────────────────────────

/**
 * Calculates the tropical ecliptic longitude of the Ascendant (°).
 * Uses Local Sidereal Time + obliquity of ecliptic.
 *
 * Formula (standard, atan2 form — no quadrant correction needed):
 *   Asc = atan2( cos(RAMC), −( sin(RAMC)·cos(ε) + tan(φ)·sin(ε) ) )
 * where RAMC = Local Sidereal Time in degrees, φ = geographic latitude, ε = obliquity.
 *
 * Sanity anchor: with ε=0 and φ=0 this reduces to Asc = RAMC + 90°, which is
 * geometrically required (the rising point of the equator is 90° of RA ahead
 * of the meridian). A sunrise birth must put the Sun on the Ascendant.
 */
export function calculateAscendant(jde: number, latitudeDeg: number, longitudeDeg: number): number {
  // Greenwich Mean Sidereal Time (degrees) at 0h UT — IAU formula
  const jd0 = Math.floor(jde - 0.5) + 0.5
  const T0 = (jd0 - 2451545.0) / 36525.0
  const theta0 = 100.4606184 + 36000.77004 * T0 + 0.000387933 * T0 * T0

  // UT hours
  const ut = (jde - jd0) * 24.0
  const gmst = norm360(theta0 + 360.98564724 * ut / 24)

  // Local Sidereal Time in degrees
  const lst = norm360(gmst + longitudeDeg)
  const RAMC = lst * DEG2RAD

  // Mean obliquity of ecliptic in radians (error vs true obliquity ~0.004°, negligible)
  const eps = meanObliquity(jde)
  const phi = latitudeDeg * DEG2RAD

  const y = Math.cos(RAMC)
  const x = -(Math.sin(RAMC) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))
  return norm360(Math.atan2(y, x) * RAD2DEG)
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Calculates a full Vedic natal chart from birth data.
 *
 * Returns planetary sidereal positions (Lahiri ayanamsa), nakshatra/pada,
 * ascendant (if birth time is known), and Whole Sign houses.
 */
export function calculateNatalChart(birthData: BirthData): NatalChart {
  const jde = birthDataToJde(
    birthData.date,
    birthData.time_unknown ? null : birthData.time,
    birthData.timezone
  )

  const ayanamsa = lahiriAyanamsa(jde)

  // ── Sun ──────────────────────────────────────────────────────────────────
  // trueVSOP87 takes the Earth planet and returns the geocentric Sun longitude
  const sunTropical = radToDeg(trueVSOP87(earthPlanet, jde).lon)
  const sunSidereal = norm360(sunTropical - ayanamsa)

  // ── Moon ─────────────────────────────────────────────────────────────────
  const moonPos = moonPosition(jde)
  const moonTropical = radToDeg(moonPos.lon)
  const moonSidereal = norm360(moonTropical - ayanamsa)

  // ── Rahu (mean ascending node) ────────────────────────────────────────────
  // moonNode() returns the mean ascending node in radians
  const rahuTropical = radToDeg(moonNode(jde))
  const rahuSidereal = norm360(rahuTropical - ayanamsa)
  const ketuSidereal = norm360(rahuSidereal + 180)

  // ── Five classical planets (geocentric VSOP87) ────────────────────────────
  const outerPlanets: Array<{ name: PlanetName; planet: Planet }> = [
    { name: 'Mercury', planet: mercuryPlanet },
    { name: 'Venus',   planet: venusPlanet },
    { name: 'Mars',    planet: marsPlanet },
    { name: 'Jupiter', planet: jupiterPlanet },
    { name: 'Saturn',  planet: saturnPlanet },
  ]

  const outerPositions = outerPlanets.map(({ name, planet }) => {
    const tropical = geoEclipticLon(planet, earthPlanet, jde)
    const sidereal = norm360(tropical - ayanamsa)
    const retro = isRetrograde(planet, earthPlanet, jde)
    return { name, sidereal, retro }
  })

  // ── Ascendant ─────────────────────────────────────────────────────────────
  let ascTropical: number | null = null
  let ascSidereal: number | null = null
  if (!birthData.time_unknown) {
    ascTropical = calculateAscendant(jde, birthData.latitude, birthData.longitude)
    ascSidereal = norm360(ascTropical - ayanamsa)
  }

  // ── Build PlanetPosition array ────────────────────────────────────────────
  const ascSign = ascSidereal !== null ? signFromDeg(ascSidereal) : null
  const ascSignIndex = ascSign ? ZODIAC_SIGNS.indexOf(ascSign) : null

  function getHouse(siderealDeg: number): number {
    if (ascSignIndex === null) return 1  // unknown without ascendant
    const signIndex = Math.floor(siderealDeg / 30) % 12
    return ((signIndex - ascSignIndex + 12) % 12) + 1
  }

  function makePlanetPosition(
    name: PlanetName,
    sidereal: number,
    retro: boolean
  ): PlanetPosition {
    const nak = getNakshatra(sidereal)
    return {
      planet: name,
      sign: signFromDeg(sidereal),
      house: getHouse(sidereal),
      degree: parseFloat(degreeInSign(sidereal).toFixed(4)),
      retrograde: retro,
      nakshatra: nak.name,
      nakshatra_pada: nak.pada,
    }
  }

  const planets: PlanetPosition[] = [
    makePlanetPosition('Sun', sunSidereal, false),
    makePlanetPosition('Moon', moonSidereal, false),
    ...outerPositions.map(p => makePlanetPosition(p.name, p.sidereal, p.retro)),
    // Rahu & Ketu are always technically retrograde in Vedic tradition
    makePlanetPosition('Rahu', rahuSidereal, true),
    makePlanetPosition('Ketu', ketuSidereal, true),
  ]

  if (ascSidereal !== null) {
    planets.push(makePlanetPosition('Ascendant', ascSidereal, false))
  }

  // ── Whole Sign Houses ─────────────────────────────────────────────────────
  const houses = Array.from({ length: 12 }, (_, i) => {
    const signIndex = ascSignIndex !== null
      ? (ascSignIndex + i) % 12
      : i  // fallback: start from Aries if no ascendant
    return {
      house: i + 1,
      sign: ZODIAC_SIGNS[signIndex],
      degree: 0,  // Whole Sign: cusp always at 0° of the sign
    }
  })

  return {
    birth_data: birthData,
    ayanamsa: 'Lahiri',
    ascendant: ascSidereal !== null
      ? { sign: signFromDeg(ascSidereal), degree: parseFloat(degreeInSign(ascSidereal).toFixed(4)) }
      : { sign: 'Aries', degree: 0 },
    planets,
    houses,
    calculated_at: new Date().toISOString(),
  }
}

// ─── Transits (Task 7) ────────────────────────────────────────────────────────

/** Converts a JS Date (an absolute instant) to Julian Day. */
export function dateToJde(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

export interface TransitPosition {
  planet: PlanetName
  sign: ZodiacSign
  degree: number
  nakshatra: string
  nakshatra_pada: number
  retrograde: boolean
}

/** Sidereal (Lahiri) longitude of the Moon at a given instant — cheap, for day-grids. */
export function moonSiderealDeg(date: Date): number {
  const jde = dateToJde(date)
  return norm360(radToDeg(moonPosition(jde).lon) - lahiriAyanamsa(jde))
}

/** Sidereal (Lahiri) longitude of the Sun at a given instant. */
export function sunSiderealDeg(date: Date): number {
  const jde = dateToJde(date)
  return norm360(radToDeg(trueVSOP87(earthPlanet, jde).lon) - lahiriAyanamsa(jde))
}

/** Full sidereal positions of all 9 grahas at a given instant. */
export function getTransitSnapshot(date: Date): TransitPosition[] {
  const jde = dateToJde(date)
  const ayanamsa = lahiriAyanamsa(jde)

  const make = (planet: PlanetName, sidereal: number, retro: boolean): TransitPosition => {
    const nak = getNakshatra(sidereal)
    return {
      planet,
      sign: signFromDeg(sidereal),
      degree: parseFloat(degreeInSign(sidereal).toFixed(2)),
      nakshatra: nak.name,
      nakshatra_pada: nak.pada,
      retrograde: retro,
    }
  }

  const sun = norm360(radToDeg(trueVSOP87(earthPlanet, jde).lon) - ayanamsa)
  const moon = norm360(radToDeg(moonPosition(jde).lon) - ayanamsa)
  const rahu = norm360(radToDeg(moonNode(jde)) - ayanamsa)

  const classical: Array<{ name: PlanetName; planet: Planet }> = [
    { name: 'Mercury', planet: mercuryPlanet },
    { name: 'Venus',   planet: venusPlanet },
    { name: 'Mars',    planet: marsPlanet },
    { name: 'Jupiter', planet: jupiterPlanet },
    { name: 'Saturn',  planet: saturnPlanet },
  ]

  return [
    make('Sun', sun, false),
    make('Moon', moon, false),
    ...classical.map(({ name, planet }) =>
      make(
        name,
        norm360(geoEclipticLon(planet, earthPlanet, jde) - ayanamsa),
        isRetrograde(planet, earthPlanet, jde)
      )
    ),
    make('Rahu', rahu, true),
    make('Ketu', norm360(rahu + 180), true),
  ]
}

export type GocharaQuality = 'favorable' | 'neutral' | 'challenging'

/**
 * Classical Moon gochara: quality of the transiting Moon's sign counted
 * from the natal Moon sign (1-based house count).
 *
 *   Favorable:   1, 3, 6, 7, 10, 11
 *   Neutral:     2, 5, 9
 *   Challenging: 4, 8 (chandrashtama — the strongest caution), 12
 */
export function moonGocharaQuality(
  natalMoonSign: ZodiacSign,
  transitMoonSign: ZodiacSign
): { quality: GocharaQuality; houseFromMoon: number; isChandrashtama: boolean } {
  const natalIdx = ZODIAC_SIGNS.indexOf(natalMoonSign)
  const transitIdx = ZODIAC_SIGNS.indexOf(transitMoonSign)
  const houseFromMoon = ((transitIdx - natalIdx + 12) % 12) + 1

  const favorable = [1, 3, 6, 7, 10, 11]
  const challenging = [4, 8, 12]

  return {
    quality: favorable.includes(houseFromMoon)
      ? 'favorable'
      : challenging.includes(houseFromMoon)
      ? 'challenging'
      : 'neutral',
    houseFromMoon,
    isChandrashtama: houseFromMoon === 8,
  }
}

// ─── Utility exports (used by transit calendar etc.) ─────────────────────────

export { signFromDeg, getNakshatra, norm360, ZODIAC_SIGNS, NAKSHATRAS }
export type { ZodiacSign }
