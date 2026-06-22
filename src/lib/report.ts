/**
 * Client for the deep-dive report Edge Function (one-time personalized reports).
 * Reports are generated once per user from their chart, stored permanently, and
 * re-viewable free forever after purchase. Premium = free.
 */
import { supabase } from './supabase'

const PROXY_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '/api'

export type ReportKind = 'career' | 'year_ahead' | 'birth_chart' | 'numerology'

export interface ReportContext {
  name: string
  ascendant: string
  planets: string
  dasha?: string
}

export interface NumerologyContext {
  name: string
  life_path: string
  expression: string
  soul_urge: string
  birthday: string
}

export interface ReportResult {
  body?: string
  locked?: boolean
  cost?: number
}

export async function getReport(args: {
  kind: ReportKind
  context: ReportContext | NumerologyContext
  unlock?: boolean
}): Promise<ReportResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Please sign in.')

  const res = await fetch(`${PROXY_BASE}/report`, {
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
