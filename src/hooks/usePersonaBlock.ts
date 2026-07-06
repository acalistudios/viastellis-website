/**
 * usePersonaBlock — the compact "about the seeker" personalization block that
 * gets passed into AI edge functions. Centralizes buildPersonaContext so every
 * caller (Stella chat, tarot, horoscope, reports, moon reading) stays consistent.
 * Returns '' when there's nothing to add.
 */
import { useMemo } from 'react'
import { useUser } from '@/store/UserContext'
import { useNatalChart } from '@/hooks/useNatalChart'
import { buildPersonaContext } from '@/lib/personalization'

export function usePersonaBlock(): string {
  const { personalization, memories } = useUser()
  const { chart } = useNatalChart()
  return useMemo(
    () => buildPersonaContext({
      personalization,
      birthDate: chart?.birth_data.date ?? null,
      memories: memories.map(m => m.note),
    }),
    [personalization, memories, chart],
  )
}
