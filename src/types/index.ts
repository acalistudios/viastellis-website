// ─── User & Auth ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  subscription_tier: 'free' | 'premium'
  credits_remaining: number
  created_at: string
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
