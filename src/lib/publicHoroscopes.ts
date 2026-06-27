/**
 * Client for the PUBLIC `public-horoscopes` edge function (no auth needed).
 * Powers the public "Today's Horoscopes" demo page.
 */

const PROXY_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '/api'
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export type HoroscopeSystem = 'western' | 'vedic'

export interface PublicHoroscope {
  sign: string
  body: string
}

export async function getPublicHoroscopes(
  system: HoroscopeSystem,
  date: string,
): Promise<PublicHoroscope[]> {
  const res = await fetch(`${PROXY_BASE}/public-horoscopes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify({ system, date }),
  })
  if (!res.ok) throw new Error('Could not load horoscopes. Please try again.')
  const data = (await res.json()) as { horoscopes?: PublicHoroscope[] }
  return data.horoscopes ?? []
}
