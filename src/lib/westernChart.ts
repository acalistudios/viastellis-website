/**
 * Western (tropical) natal chart engine.
 *
 * Distinct from the Vedic engine in ephemeris.ts:
 *  - Tropical zodiac (NO ayanamsa subtraction).
 *  - Adds the outer planets Uranus, Neptune, Pluto.
 *  - Placidus house cusps (with an equal-house fallback above ~66° latitude,
 *    where Placidus is undefined for circumpolar degrees).
 *  - Aspect grid (conjunction / sextile / square / trine / opposition) with orbs.
 *  - No nakshatras / dashas (those are Vedic-only concepts).
 *
 * Reference frames: astronomia's VSOP87B path returns of-date ecliptic
 * longitudes (verified empirically — the sidereal Sun reproduces Makara
 * Sankranti timing). Pluto comes from a separate J2000 theory, so its
 * longitude is precessed to of-date with the general precession in longitude.
 */

import { trueVSOP87 } from 'astronomia/solar'
import { position as moonPosition, node as moonNode } from 'astronomia/moonposition'
import { Planet } from 'astronomia/planetposition'
import { meanObliquity } from 'astronomia/nutation'
import { heliocentric as plutoHeliocentric } from 'astronomia/pluto'

import earthData from 'astronomia/data/vsop87Bearth'
import mercuryData from 'astronomia/data/vsop87Bmercury'
import venusData from 'astronomia/data/vsop87Bvenus'
import marsData from 'astronomia/data/vsop87Bmars'
import jupiterData from 'astronomia/data/vsop87Bjupiter'
import saturnData from 'astronomia/data/vsop87Bsaturn'
import uranusData from 'astronomia/data/vsop87Buranus'
import neptuneData from 'astronomia/data/vsop87Bneptune'

import {
  birthDataToJde,
  localSiderealTime,
  signFromDeg,
  norm360,
  ZODIAC_SIGNS,
} from './ephemeris'

import type {
  BirthData,
  WesternChart,
  WesternBody,
  WesternPlanetPosition,
  WesternHouseCusp,
  Aspect,
  AspectType,
  HouseSystem,
  ZodiacSign,
} from '@/types'

const RAD2DEG = 180 / Math.PI
const DEG2RAD = Math.PI / 180

// Pre-instantiate (expensive to recreate per call)
const earth = new Planet(earthData)
const planetObjs: Record<string, Planet> = {
  Mercury: new Planet(mercuryData),
  Venus: new Planet(venusData),
  Mars: new Planet(marsData),
  Jupiter: new Planet(jupiterData),
  Saturn: new Planet(saturnData),
  Uranus: new Planet(uranusData),
  Neptune: new Planet(neptuneData),
}

// ─── Longitude helpers ──────────────────────────────────────────────────────

function helioToRect(lon: number, lat: number, r: number) {
  const cosB = Math.cos(lat)
  return { x: r * cosB * Math.cos(lon), y: r * cosB * Math.sin(lon), z: r * Math.sin(lat) }
}

/** Geocentric tropical (of-date) ecliptic longitude of a VSOP87 planet, in degrees. */
function geoEclipticLon(planet: Planet, jde: number): number {
  const p = planet.position(jde)
  const e = earth.position(jde)
  const pr = helioToRect(p.lon, p.lat, p.range)
  const er = helioToRect(e.lon, e.lat, e.range)
  return norm360(Math.atan2(pr.y - er.y, pr.x - er.x) * RAD2DEG)
}

/** General precession in ecliptic longitude from J2000 to jde, in degrees (IAU2006). */
function precessionInLongitude(jde: number): number {
  const T = (jde - 2451545.0) / 36525.0
  return (5029.0966 * T + 1.11161 * T * T) / 3600
}

/** Geocentric tropical longitude of Pluto (precessed from its J2000 theory to of-date). */
function plutoLon(jde: number): number {
  const p = plutoHeliocentric(jde) // J2000 heliocentric ecliptic {lon,lat,range} (radians/AU)
  const e = earth.position(jde)
  const pr = helioToRect(p.lon, p.lat, p.range)
  const er = helioToRect(e.lon, e.lat, e.range)
  const j2000Lon = norm360(Math.atan2(pr.y - er.y, pr.x - er.x) * RAD2DEG)
  return norm360(j2000Lon + precessionInLongitude(jde))
}

/** All tropical body longitudes (degrees) at an instant — excludes Asc/MC. */
function bodyLongitudes(jde: number): Record<string, number> {
  const out: Record<string, number> = {}
  out.Sun = norm360(trueVSOP87(earth, jde).lon * RAD2DEG)
  out.Moon = norm360(moonPosition(jde).lon * RAD2DEG)
  for (const name of Object.keys(planetObjs)) out[name] = geoEclipticLon(planetObjs[name], jde)
  out.Pluto = plutoLon(jde)
  const node = norm360(moonNode(jde) * RAD2DEG)
  out['North Node'] = node
  out['South Node'] = norm360(node + 180)
  return out
}

// ─── Placidus houses ──────────────────────────────────────────────────────────

/** Midheaven tropical longitude (degrees) from RAMC and obliquity. */
function midheavenLon(ramcDeg: number, epsRad: number): number {
  const ramc = ramcDeg * DEG2RAD
  return norm360(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(epsRad)) * RAD2DEG)
}

/**
 * Solve one intermediate Placidus cusp by fixed-point iteration on the
 * semi-diurnal arc. `east` = cusp east of the MC (houses 11, 12); otherwise
 * west (houses 8, 9). `fraction` = 1/3 or 2/3 of the semi-arc.
 * Returns null when the degree is circumpolar (Placidus undefined).
 */
function placidusCusp(
  ramcDeg: number, latDeg: number, epsRad: number, fraction: number, east: boolean,
): number | null {
  const lat = latDeg * DEG2RAD
  const sign = east ? 1 : -1
  let R = ramcDeg + sign * fraction * 90 // initial guess (SDA ≈ 90°)
  for (let i = 0; i < 100; i++) {
    const Rr = R * DEG2RAD
    const lamR = Math.atan2(Math.sin(Rr), Math.cos(Rr) * Math.cos(epsRad))
    const dec = Math.asin(Math.sin(epsRad) * Math.sin(lamR))
    const v = -Math.tan(lat) * Math.tan(dec)
    if (v <= -1 || v >= 1) return null // circumpolar → fall back
    const sda = Math.acos(v) * RAD2DEG
    const Rnew = ramcDeg + sign * fraction * sda
    if (Math.abs(Rnew - R) < 1e-8) { R = Rnew; break }
    R = Rnew
  }
  const Rr = R * DEG2RAD
  return norm360(Math.atan2(Math.sin(Rr), Math.cos(Rr) * Math.cos(epsRad)) * RAD2DEG)
}

/**
 * Twelve house cusp longitudes (degrees), index 0 = house 1 (Asc).
 * Uses Placidus; falls back to equal-house (Asc-anchored) at high latitude.
 */
function houseCuspLongitudes(
  ascLon: number, mcLon: number, ramcDeg: number, latDeg: number, epsRad: number,
): { cusps: number[]; system: HouseSystem } {
  const c11 = placidusCusp(ramcDeg, latDeg, epsRad, 1 / 3, true)
  const c12 = placidusCusp(ramcDeg, latDeg, epsRad, 2 / 3, true)
  const c9 = placidusCusp(ramcDeg, latDeg, epsRad, 1 / 3, false)
  const c8 = placidusCusp(ramcDeg, latDeg, epsRad, 2 / 3, false)

  if (c11 == null || c12 == null || c9 == null || c8 == null) {
    // Equal houses: each cusp 30° from the Ascendant.
    const cusps = Array.from({ length: 12 }, (_, i) => norm360(ascLon + i * 30))
    return { cusps, system: 'equal' }
  }

  const cusps = new Array<number>(12)
  cusps[0] = ascLon            // 1
  cusps[9] = mcLon             // 10
  cusps[10] = c11              // 11
  cusps[11] = c12              // 12
  cusps[7] = c8                // 8
  cusps[8] = c9                // 9
  cusps[3] = norm360(mcLon + 180)  // 4 (IC)
  cusps[6] = norm360(ascLon + 180) // 7 (Desc)
  cusps[1] = norm360(c8 + 180)     // 2  (opposite 8)
  cusps[2] = norm360(c9 + 180)     // 3  (opposite 9)
  cusps[4] = norm360(c11 + 180)    // 5  (opposite 11)
  cusps[5] = norm360(c12 + 180)    // 6  (opposite 12)
  return { cusps, system: 'placidus' }
}

/** Which house (1–12) a longitude falls in, given the 12 ordered cusp longitudes. */
function houseOf(lon: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i]
    const end = cusps[(i + 1) % 12]
    const span = norm360(end - start)
    const off = norm360(lon - start)
    if (off < span) return i + 1
  }
  return 1
}

// ─── Aspects ────────────────────────────────────────────────────────────────

const ASPECT_DEFS: Array<{ type: AspectType; angle: number; orb: number }> = [
  { type: 'conjunction', angle: 0, orb: 8 },
  { type: 'sextile', angle: 60, orb: 5 },
  { type: 'square', angle: 90, orb: 7 },
  { type: 'trine', angle: 120, orb: 7 },
  { type: 'opposition', angle: 180, orb: 8 },
]

// Bodies that participate in the aspect grid (South Node omitted — mirrors North).
const ASPECT_BODIES: WesternBody[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
  'Uranus', 'Neptune', 'Pluto', 'North Node', 'Ascendant', 'Midheaven',
]

/** Smallest angular separation (0–180°) between two longitudes. */
function separation(a: number, b: number): number {
  const d = Math.abs(norm360(a - b))
  return d > 180 ? 360 - d : d
}

function computeAspects(now: Record<string, number>, later: Record<string, number>): Aspect[] {
  const aspects: Aspect[] = []
  for (let i = 0; i < ASPECT_BODIES.length; i++) {
    for (let j = i + 1; j < ASPECT_BODIES.length; j++) {
      const a = ASPECT_BODIES[i]
      const b = ASPECT_BODIES[j]
      if (now[a] == null || now[b] == null) continue
      const sepNow = separation(now[a], now[b])
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(sepNow - def.angle)
        if (orb <= def.orb) {
          // Applying if the orb is shrinking toward exactness over a small step.
          const sepLater = separation(later[a] ?? now[a], later[b] ?? now[b])
          const orbLater = Math.abs(sepLater - def.angle)
          aspects.push({
            a, b, type: def.type,
            orb: parseFloat(orb.toFixed(2)),
            applying: orbLater < orb,
          })
          break // one aspect per pair (closest angle wins by orb check order)
        }
      }
    }
  }
  return aspects
}

// ─── Assembly ─────────────────────────────────────────────────────────────────

const PLANET_ORDER: WesternBody[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
  'Uranus', 'Neptune', 'Pluto', 'North Node', 'South Node',
]

function toPosition(body: WesternBody, lon: number, house: number, retro: boolean): WesternPlanetPosition {
  return {
    body,
    sign: signFromDeg(lon),
    house,
    degree: parseFloat((lon % 30).toFixed(4)),
    longitude: parseFloat(lon.toFixed(4)),
    retrograde: retro,
  }
}

function signOf(lon: number): ZodiacSign {
  return ZODIAC_SIGNS[Math.floor(norm360(lon) / 30) % 12]
}

export function calculateWesternChart(birthData: BirthData): WesternChart {
  const jde = birthDataToJde(
    birthData.date,
    birthData.time_unknown ? null : birthData.time,
    birthData.timezone,
  )
  const dt = 0.02 // ~29 min, for retrograde + applying/separating direction
  const eps = meanObliquity(jde)

  const now = bodyLongitudes(jde)
  const later = bodyLongitudes(jde + dt)

  // Ascendant + MC (require birth time). If unknown, fall back to a solar-whole
  // layout: treat the Sun's sign as the 1st house (common "no birth time" mode).
  const hasTime = !birthData.time_unknown
  const ramcDeg = hasTime ? localSiderealTime(jde, birthData.longitude) : 0
  const ascLon = hasTime
    ? // reuse the tested ascendant geometry
      (() => {
        const RAMC = ramcDeg * DEG2RAD
        const y = Math.cos(RAMC)
        const x = -(Math.sin(RAMC) * Math.cos(eps) + Math.tan(birthData.latitude * DEG2RAD) * Math.sin(eps))
        return norm360(Math.atan2(y, x) * RAD2DEG)
      })()
    : norm360(Math.floor(now.Sun / 30) * 30) // start of the Sun's sign
  const mcLon = hasTime ? midheavenLon(ramcDeg, eps) : norm360(ascLon + 270)

  const { cusps, system } = hasTime
    ? houseCuspLongitudes(ascLon, mcLon, ramcDeg, birthData.latitude, eps)
    : { cusps: Array.from({ length: 12 }, (_, i) => norm360(ascLon + i * 30)), system: 'whole_sign' as HouseSystem }

  // Build planet positions.
  const planets: WesternPlanetPosition[] = PLANET_ORDER.map((body) => {
    const lon = now[body]
    const moved = norm360(later[body] - lon)
    const retro = body === 'North Node' || body === 'South Node'
      ? true // nodes are always retrograde
      : (moved > 180 ? moved - 360 : moved) < 0
    return toPosition(body, lon, houseOf(lon, cusps), retro)
  })

  // Aspects include Asc + MC as points.
  const nowWithAngles = { ...now, Ascendant: ascLon, Midheaven: mcLon }
  const laterWithAngles = { ...later, Ascendant: ascLon, Midheaven: mcLon }
  const aspects = computeAspects(nowWithAngles, laterWithAngles)

  const houses: WesternHouseCusp[] = cusps.map((lon, i) => ({
    house: i + 1,
    sign: signOf(lon),
    degree: parseFloat((norm360(lon) % 30).toFixed(4)),
    longitude: parseFloat(norm360(lon).toFixed(4)),
  }))

  return {
    birth_data: birthData,
    zodiac: 'tropical',
    house_system: system,
    ascendant: { sign: signOf(ascLon), degree: parseFloat((ascLon % 30).toFixed(4)), longitude: parseFloat(ascLon.toFixed(4)) },
    midheaven: { sign: signOf(mcLon), degree: parseFloat((mcLon % 30).toFixed(4)), longitude: parseFloat(mcLon.toFixed(4)) },
    planets,
    houses,
    aspects,
    calculated_at: new Date().toISOString(),
  }
}
