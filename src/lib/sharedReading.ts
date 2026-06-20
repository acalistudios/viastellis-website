/**
 * Client for the shared-reading Edge Function (calendar day + weekly forecast).
 * These are generated once per (Moon sign/nakshatra + date) and shared across
 * users to save AI cost, while still charging 1 credit per user (premium = free).
 */
import { supabase } from './supabase'

const PROXY_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '/api'

export type ReadingKind = 'calendar_day' | 'weekly'

export interface SharedReadingResult {
  body?: string
  locked?: boolean
  cost?: number
}

export async function getSharedReading(args: {
  kind: ReadingKind
  cacheKey: string
  data: Record<string, string>
  unlock?: boolean
}): Promise<SharedReadingResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Please sign in.')

  const res = await fetch(`${PROXY_BASE}/shared-reading`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(args),
  })

  if (res.status === 402) {
    throw new Error("You're out of credits. Upgrade to Premium or grab a credit pack to unlock this reading.")
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error ?? 'Could not load this reading.')
  }
  return res.json()
}
