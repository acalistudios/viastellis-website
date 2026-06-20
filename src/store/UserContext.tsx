import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

interface UserContextValue {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  /** True only on the very first hydration with no cached data; cached loads render instantly. */
  loading: boolean
  /** True if the signed-in user has at least one primary birth chart saved. */
  hasPrimaryChart: boolean
  /** Re-check whether the user has a primary chart (call after saving one). */
  refreshChartStatus: () => Promise<void>
}

const UserContext = createContext<UserContextValue>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  hasPrimaryChart: false,
  refreshChartStatus: async () => {},
})

// localStorage keys — cached so revisits render instantly (stale-while-revalidate).
const PROFILE_KEY = 'viastellis-profile'
const HAS_CHART_KEY = 'viastellis-has-chart'

function readCachedProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

function clearCache() {
  try {
    localStorage.removeItem(PROFILE_KEY)
    localStorage.removeItem(HAS_CHART_KEY)
    // Purge per-user birth-data caches (personal data) on sign-out.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && k.startsWith('viastellis-birthdata-')) localStorage.removeItem(k)
    }
  } catch { /* ignore */ }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(() => readCachedProfile())
  const [hasPrimaryChart, setHasPrimaryChart] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HAS_CHART_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [loading, setLoading] = useState(true)

  // ── Initial session + auth listener ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        setProfile(null)
        setHasPrimaryChart(false)
        clearCache()
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Hydrate profile + chart status when the session resolves ──────────────
  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      setHasPrimaryChart(false)
      setLoading(false)
      return
    }

    const userId = session.user.id

    // If we have cached data for THIS user, show it immediately (no spinner).
    const cached = readCachedProfile()
    const haveValidCache = cached?.id === userId
    if (haveValidCache) {
      setProfile(cached)
      setLoading(false)
    }

    let cancelled = false
    async function revalidate() {
      if (!haveValidCache) setLoading(true) // first-ever load: block until fetched
      try {
        const [profileRes, chartRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          supabase
            .from('birth_charts')
            .select('id')
            .eq('user_id', userId)
            .eq('is_primary', true)
            .limit(1),
        ])
        if (cancelled) return

        const p = (profileRes.data as UserProfile) ?? null
        const hasChart = (chartRes.data?.length ?? 0) > 0
        setProfile(p)
        setHasPrimaryChart(hasChart)
        try {
          if (p) localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
          localStorage.setItem(HAS_CHART_KEY, String(hasChart))
        } catch { /* ignore */ }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    revalidate()
    return () => { cancelled = true }
  }, [session])

  // ── Manual refresh (called after saving a new birth chart) ────────────────
  async function refreshChartStatus() {
    if (!session?.user) return
    const { data } = await supabase
      .from('birth_charts')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('is_primary', true)
      .limit(1)
    const hasChart = (data?.length ?? 0) > 0
    setHasPrimaryChart(hasChart)
    try {
      localStorage.setItem(HAS_CHART_KEY, String(hasChart))
    } catch { /* ignore */ }
  }

  return (
    <UserContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        hasPrimaryChart,
        refreshChartStatus,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
