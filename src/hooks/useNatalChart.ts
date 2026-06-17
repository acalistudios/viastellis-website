/**
 * useNatalChart — loads the signed-in user's primary birth chart row from
 * Supabase, runs the ephemeris engine on it, and returns the computed chart.
 *
 * Calculation happens client-side (it's pure math, ~ms) so we don't need to
 * store chart_data server-side yet — though the column exists for caching later.
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/store/UserContext'
import { calculateNatalChart } from '@/lib/ephemeris'
import type { BirthData, NatalChart } from '@/types'
import type { Database } from '@/types/supabase'

type BirthChartRow = Database['public']['Tables']['birth_charts']['Row']

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

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: dbError } = await supabase
          .from('birth_charts')
          .select('*')
          .eq('user_id', user!.id)
          .eq('is_primary', true)
          .limit(1)
          .maybeSingle()

        if (dbError) throw dbError
        if (!data) throw new Error('No birth chart found. Please complete onboarding.')
        if (cancelled) return

        const bd = rowToBirthData(data)
        setBirthData(bd)
        setChartId(data.id)
        setChart(calculateNatalChart(bd))
      } catch (err: unknown) {
        if (!cancelled) {
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
