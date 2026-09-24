/**
 * usePreferredName — the name to address the user by.
 *
 * Two names exist in this app and they drift apart:
 *
 *   profiles.display_name   written once from the OAuth provider at sign-up
 *                           (so, the Google account name). Nothing in the UI
 *                           can edit it.
 *   birth_charts.name       what the user actually typed, and what Home greets
 *                           them with ("Welcome back, …").
 *
 * "Tell Stella about yourself" used display_name and so addressed people by
 * their Gmail name even after they had deliberately set a different one — and
 * it passed that same wrong name to the model when distilling the intake, so
 * Stella was being *told* the wrong name too.
 *
 * The user-set name wins. display_name is only a fallback for an account that
 * has not created a chart yet.
 */

import { useUser } from '@/store/UserContext'
import { useNatalChart } from '@/hooks/useNatalChart'

export function usePreferredName(fallback = 'friend'): string {
  const { profile } = useUser()
  const { chart } = useNatalChart()
  return (
    chart?.birth_data.name?.trim() ||
    profile?.display_name?.trim() ||
    fallback
  )
}
