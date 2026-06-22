/**
 * Minimal type declarations for the `astronomia` package (no official @types).
 * Only the functions/classes used in src/lib/ephemeris.ts are declared here.
 * Import paths match the astronomia package exports map.
 */

declare module 'astronomia' {
  export const eclipse: {
    TYPE: { None: 0; Partial: 1; Annular: 2; AnnularTotal: 3; Penumbral: 4; Umbral: 5; Total: 6 }
    solar(year: number): { type: number; central: boolean; jdeMax: number; magnitude?: number }
    lunar(year: number): { type: number; jdeMax: number; magnitude?: number }
  }
  export const moonphase: {
    meanLunarMonth: number
    newMoon(year: number): number
    full(year: number): number
    first(year: number): number
    last(year: number): number
  }
}

declare module 'astronomia/julian' {
  export function CalendarGregorianToJD(y: number, m: number, d: number): number
}

declare module 'astronomia/solar' {
  export function trueLongitude(T: number): number
  export function trueVSOP87(planet: unknown, jde: number): { lon: number; lat: number; range: number }
}

declare module 'astronomia/moonposition' {
  export function position(jde: number): { lon: number; lat: number; range: number }
  export function node(jde: number): number
}

declare module 'astronomia/planetposition' {
  export class Planet {
    constructor(data: unknown)
    position(jde: number): { lon: number; lat: number; range: number }
    position2000(jde: number): { lon: number; lat: number; range: number }
  }
}

declare module 'astronomia/nutation' {
  export function nutation(jde: number): { Δψ: number; Δε: number }
  export function meanObliquity(jde: number): number
}

declare module 'astronomia/data/vsop87Bearth' {
  const data: unknown
  export default data
}
declare module 'astronomia/data/vsop87Bmercury' {
  const data: unknown
  export default data
}
declare module 'astronomia/data/vsop87Bvenus' {
  const data: unknown
  export default data
}
declare module 'astronomia/data/vsop87Bmars' {
  const data: unknown
  export default data
}
declare module 'astronomia/data/vsop87Bjupiter' {
  const data: unknown
  export default data
}
declare module 'astronomia/data/vsop87Bsaturn' {
  const data: unknown
  export default data
}
declare module 'astronomia/data/vsop87Buranus' {
  const data: unknown
  export default data
}
declare module 'astronomia/data/vsop87Bneptune' {
  const data: unknown
  export default data
}

declare module 'astronomia/pluto' {
  export function heliocentric(jde: number): { lon: number; lat: number; range: number }
  export function astrometric(jde: number, earth: unknown): { ra: number; dec: number }
}
