// ─── User & Auth ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  subscription_tier: 'free' | 'premium'
  credits_remaining: number
  default_horoscope_lens: 'western_sun' | 'vedic_moon' | 'vedic_sun'
  chart_system: 'vedic' | 'western'
  created_at: string
}

// ─── Personalization ─────────────────────────────────────────────────────────
// Declared profile that enriches AI readings. See ViaStellis Private/personalization-design.md.

export type PersonalizationMode = 'chart_only' | 'personalized'
export type Pronouns = 'she' | 'he' | 'they' | 'prefer_not'
export type FocusArea = 'love' | 'career' | 'money' | 'health' | 'growth'

export interface UserPersonalization {
  personalization_mode: PersonalizationMode
  pronouns: Pronouns | null
  focus_areas: FocusArea[]
}

/** Privacy-preserving defaults for a user who hasn't set anything yet. */
export const DEFAULT_PERSONALIZATION: UserPersonalization = {
  personalization_mode: 'chart_only',
  pronouns: null,
  focus_areas: [],
}

/** A short, user-visible note Stella keeps (personalized mode only). */
export interface StellaMemory {
  id: string
  note: string
  source: 'intake' | 'chat'
  created_at: string
  updated_at: string
}

// ─── Birth Data ───────────────────────────────────────────────────────────────

export interface BirthData {
  name: string
  date: string         // ISO 8601: YYYY-MM-DD
  time: string         // HH:MM (24h)
  time_unknown: boolean
  city: string
  country: string
  latitude: number
  longitude: number
  timezone: string     // IANA timezone e.g. "America/Los_Angeles"
}

// ─── Natal Chart ─────────────────────────────────────────────────────────────

export type ZodiacSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces'

export type Planet =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Rahu' | 'Ketu'
  | 'Ascendant'

export interface PlanetPosition {
  planet: Planet
  sign: ZodiacSign
  house: number          // 1–12
  degree: number         // 0–29.99
  retrograde: boolean
  nakshatra: string      // Vedic lunar mansion
  nakshatra_pada: number // 1–4
}

export interface NatalChart {
  birth_data: BirthData
  ayanamsa: 'Lahiri'
  ascendant: { sign: ZodiacSign; degree: number }
  planets: PlanetPosition[]
  houses: Array<{ house: number; sign: ZodiacSign; degree: number }>
  calculated_at: string
}

// ─── Western (tropical) Chart ──────────────────────────────────────────────────
// Kept fully separate from the Vedic NatalChart above. Western uses the tropical
// zodiac, the outer planets (Uranus/Neptune/Pluto), Placidus houses, and aspects.

export type WesternBody =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto'
  | 'North Node' | 'South Node' | 'Ascendant' | 'Midheaven'

export interface WesternPlanetPosition {
  body: WesternBody
  sign: ZodiacSign
  house: number          // 1–12 (by Placidus cusp)
  degree: number         // 0–29.99 within the sign
  longitude: number      // absolute tropical longitude 0–359.99
  retrograde: boolean
}

export type AspectType =
  | 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'

export interface Aspect {
  a: WesternBody
  b: WesternBody
  type: AspectType
  orb: number            // degrees from exact (0 = exact)
  applying: boolean      // true = forming, false = separating
}

export interface WesternHouseCusp {
  house: number          // 1–12
  sign: ZodiacSign
  degree: number         // 0–29.99 within the sign
  longitude: number      // absolute tropical longitude of the cusp
}

export type HouseSystem = 'placidus' | 'whole_sign' | 'equal'

export interface WesternChart {
  birth_data: BirthData
  zodiac: 'tropical'
  house_system: HouseSystem
  ascendant: { sign: ZodiacSign; degree: number; longitude: number }
  midheaven: { sign: ZodiacSign; degree: number; longitude: number }
  planets: WesternPlanetPosition[]
  houses: WesternHouseCusp[]
  aspects: Aspect[]
  calculated_at: string
}

// ─── Stella AI ───────────────────────────────────────────────────────────────

export type StellaPersona = 'stoic' | 'sassy' | 'warm'

export interface ChatMessage {
  id: string
  role: 'user' | 'stella'
  text: string
  timestamp: string
  isStreaming?: boolean
}

// ─── Compatibility ────────────────────────────────────────────────────────────

export interface CompatibilityReport {
  person_a: BirthData
  person_b: BirthData
  vibe_score: number     // 0–100 (entertainment only)
  summary: string
  strengths: string[]
  tensions: string[]
  generated_at: string
}

// ─── Decision Assistant ───────────────────────────────────────────────────────

export type DecisionAnswer = 'green_light' | 'caution' | 'reflect'

export interface DecisionReport {
  question: string
  answer: DecisionAnswer
  reasoning: string
  transits_considered: string[]
  generated_at: string
}

// ─── Disclaimer ──────────────────────────────────────────────────────────────

export const ENTERTAINMENT_DISCLAIMER =
  'All insights are for entertainment purposes only. ' +
  'ViaStellis does not provide financial, medical, legal, or psychological advice.'
