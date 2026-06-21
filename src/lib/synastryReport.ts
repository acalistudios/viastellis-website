/**
 * Client for the synastry-report Edge Function (one-time, per-pair relationship
 * deep-dive). Generated once from BOTH charts, stored per (user, partner),
 * re-viewable free forever after purchase. Premium = free.
 */
import { supabase } from './supabase'

const PROXY_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '/api'

export interface SynastryContext {
  userName: string
  userAscendant: string
  userPlanets: string
  partnerName: string
  partnerAscendant: string
  partnerPlanets: string
}

export interface SynastryResult {
  body?: string
  locked?: boolean
  cost?: number
}

/** Stable per-pair key so a bought report re-opens free for the same partner. */
export function partnerKeyOf(name: string, date: string): string {
  return `${name.trim().toLowerCase()}|${date}`
}

export async function getSynastryReport(args: {
  partnerKey: string
  context: SynastryContext
  unlock?: boolean
}): Promise<SynastryResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Please sign in.')

  const res = await fetch(`${PROXY_BASE}/synastry-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(args),
  })

  if (res.status === 402) {
    throw new Error("You're out of credits. Add a credit pack or go Premium to unlock this report.")
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error ?? 'Could not load this report.')
  }
  return res.json()
}
