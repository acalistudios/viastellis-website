/**
 * useNatalChart — loads the signed-in user's primary birth chart and runs the
 * ephemeris engine on it.
 *
 * Calculation is pure client-side math (~ms). We cache the birth data per user
 * in localStorage so revisits render the chart INSTANTLY (no spinner), then
 * revalidate against Supabase in the background (stale-while-revalidate).
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/store/UserContext'
import { calculateNatalChart } from '@/lib/ephemeris'
import type { BirthData, NatalChart } from '@/types'
import type { Database } from '@/types/supabase'

type BirthChartRow = Database['public']['Tables']['birth_charts']['Row']

const CACHE_PREFIX = 'viastellis-birthdata-'

interface CachedChart {
  birthData: BirthData
  chartId: string
}

function readCache(userId: string): CachedChart | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + userId)
    return raw ? (JSON.parse(raw) as CachedChart) : null
  } catch {
    return null
  }
}

function writeCache(userId: string, value: CachedChart) {
  try {
    localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(value))
  } catch { /* ignore */ }
}

function rowToBirthData(row: BirthChartRow): BirthData {
  return {
    name: row.name,
    date: row.birth_date,
    time: row.birth_time ? row.birth_time.slice(0, 5) : '12:00', // "HH:MM:SS" → "HH:MM"
    time_unknown: row.time_unknown,
    city: row.city,
    country: row.country,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    timezone: row.timezone,
  }
}

interface UseNatalChartResult {
  chart: NatalChart | null
  birthData: BirthData | null
  /** Row id of the primary birth_charts record (needed for report foreign keys). */
  chartId: string | null
  loading: boolean
  error: string | null
}

export function useNatalChart(): UseNatalChartResult {
  const { user } = useUser()
  const [chart, setChart] = useState<NatalChart | null>(null)
  const [birthData, setBirthData] = useState<BirthData | null>(null)
  const [chartId, setChartId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setChart(null)
      setBirthData(null)
      setChartId(null)
      setLoading(false)
      return
    }

    const userId = user.id

    // Instant render from cache, if present.
    const cached = readCache(userId)
    if (cached) {
      setBirthData(cached.birthData)
      setChartId(cached.chartId)
      setChart(calculateNatalChart(cached.birthData))
      setLoading(false)
      setError(null)
    }

    let cancelled = false
    async function load() {
      if (!cached) setLoading(true)
      setError(null)
      try {
        const { data, error: dbError } = await supabase
          .from('birth_charts')
          .select('*')
          .eq('user_id', userId)
          .eq('is_primary', true)
          .limit(1)
          .maybeSingle()

        if (dbError) throw dbError
        if (cancelled) return
        if (!data) {
          // Keep showing the cache if we have one; otherwise it's a real "no chart".
          if (!cached) throw new Error('No birth chart found. Please complete onboarding.')
          return
        }

        const bd = rowToBirthData(data)
        setBirthData(bd)
        setChartId(data.id)
        setChart(calculateNatalChart(bd))
        writeCache(userId, { birthData: bd, chartId: data.id })
      } catch (err: unknown) {
        // Only surface an error if we have no cached chart to fall back on.
        if (!cancelled && !cached) {
          setError(err instanceof Error ? err.message : 'Failed to load your chart.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user])

  return { chart, birthData, chartId, loading, error }
}
