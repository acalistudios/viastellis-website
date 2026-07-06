import { supabase } from './supabase'

const PROXY_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '/api'

export interface MoonReadingContext {
  name: string
  moon_sign: string
  moon_nakshatra: string
  ascendant: string
  illumination: string
  phase_name: string
}

export interface MoonReadingResult {
  body?: string
  locked?: boolean
  cost?: number
}

/** YYYY-MM of the current month — used as the per-user cache key. */
export function moonCycleKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function getMoonReading(args: {
  cycleKey: string
  context: MoonReadingContext
  /** Compact "about the seeker" block from buildPersonaContext (may be ''). */
  persona?: string
  unlock?: boolean
}): Promise<MoonReadingResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Please sign in.')

  const res = await fetch(`${PROXY_BASE}/moon-reading`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(args),
  })

  if (res.status === 402) {
    throw new Error("You're out of credits. Add a credit pack or go Premium to unlock this reading.")
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error ?? 'Could not load your Full Moon reading.')
  }
  return res.json()
}
