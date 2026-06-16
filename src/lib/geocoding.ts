/**
 * Geocoding utilities using Nominatim (OpenStreetMap) — free, no API key.
 * Timezone lookup via TimeAPI.io — free, no API key.
 *
 * Rate limit: max 1 request/second to Nominatim. Always debounce user input.
 */

export interface CityResult {
  display_name: string   // full formatted label for the dropdown
  city: string           // short city name for storage
  country: string
  latitude: number
  longitude: number
}

interface NominatimItem {
  place_id: number
  display_name: string
  name: string
  lat: string
  lon: string
  address: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    suburb?: string
    county?: string
    state?: string
    country?: string
  }
}

/**
 * Search for cities matching a query string.
 * Returns up to 6 results ordered by relevance.
 */
export async function searchCities(query: string): Promise<CityResult[]> {
  if (!query || query.trim().length < 2) return []

  const params = new URLSearchParams({
    q: query.trim(),
    format: 'json',
    limit: '6',
    addressdetails: '1',
    featuretype: 'city',
    'accept-language': 'en',
  })

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        'User-Agent': 'ViaStellis/1.0 (viastellis.com)',
      },
    }
  )

  if (!res.ok) throw new Error('Location search failed. Please try again.')

  const data: NominatimItem[] = await res.json()

  return data.map((item) => {
    const addr = item.address
    const city =
      addr.city ??
      addr.town ??
      addr.village ??
      addr.municipality ??
      item.name

    // Build a clean label: "Los Angeles, California, United States"
    const parts = [city, addr.state, addr.country].filter(Boolean)

    return {
      display_name: parts.join(', '),
      city,
      country: addr.country ?? '',
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }
  })
}

/**
 * Get the IANA timezone for a lat/lng coordinate.
 * Falls back to the browser's local timezone if the API is unavailable.
 */
export async function getTimezone(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    const res = await fetch(
      `https://timeapi.io/api/timezone/coordinate?latitude=${latitude}&longitude=${longitude}`
    )
    if (!res.ok) throw new Error('Timezone API error')
    const data = await res.json()
    return data.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    // Graceful fallback — better than crashing onboarding
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }
}
