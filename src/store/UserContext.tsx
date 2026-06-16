import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

interface UserContextValue {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  /** True while the initial session + profile are being hydrated from Supabase. */
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

export function UserProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasPrimaryChart, setHasPrimaryChart] = useState(false)

  // ── Initial session + auth listener ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) setLoading(false) // no session → done loading
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        setProfile(null)
        setHasPrimaryChart(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Fetch profile + chart status whenever session changes ─────────────────
  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      setHasPrimaryChart(false)
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      try {
        const userId = session!.user.id

        const [profileRes, chartRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          supabase
            .from('birth_charts')
            .select('id')
            .eq('user_id', userId)
            .eq('is_primary', true)
            .limit(1),
        ])

        setProfile((profileRes.data as UserProfile) ?? null)
        setHasPrimaryChart((chartRes.data?.length ?? 0) > 0)
      } finally {
        setLoading(false)
      }
    }

    load()
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
    setHasPrimaryChart((data?.length ?? 0) > 0)
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
