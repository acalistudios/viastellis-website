/**
 * Client for the daily-horoscope Edge Function.
 * Lenses: the user's default lens is free daily; extra generic lenses cost 1
 * credit; personalized costs 2; premium is all-free; unlocked stays free that day.
 */

import { supabase } from './supabase'

const PROXY_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '/api'

export type HoroscopeLens = 'western_sun' | 'vedic_moon' | 'vedic_sun' | 'personalized' | 'love' | 'career' | 'money'

export interface HoroscopeResult {
  body?: string
  locked?: boolean
  cost?: number
}

export interface HoroscopeContext {
  rising?: string
  sun: string
  moon: string
  transits?: string
  name?: string
}

/** Local date as YYYY-MM-DD (the day the user is viewing). */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Fetch (or unlock) a horoscope lens.
 * - With unlock=false: returns the body if it's free/already-unlocked, else { locked, cost }.
 * - With unlock=true: spends credits to unlock, returns the body (throws on insufficient credits).
 */
export async function getHoroscope(args: {
  lens: HoroscopeLens
  sign?: string
  context?: HoroscopeContext
  unlock?: boolean
}): Promise<HoroscopeResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Please sign in.')

  const res = await fetch(`${PROXY_BASE}/horoscope`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ ...args, date: localDateKey() }),
  })

  if (res.status === 402) {
    throw new Error("You're out of credits. Upgrade to Premium or grab a credit pack to unlock this reading.")
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error ?? 'Could not load your horoscope.')
  }
  return res.json()
}
