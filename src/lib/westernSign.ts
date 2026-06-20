/**
 * Western (tropical) sun sign from a birth date — the familiar "what's your sign"
 * zodiac everyone knows (mid-April = Aries). Used only for the free daily-horoscope
 * lens; the rest of the app remains sidereal/Vedic.
 */

import type { ZodiacSign } from '@/types'

/** Get the Western tropical sun sign for an ISO birth date (YYYY-MM-DD). */
export function westernSunSign(birthDateISO: string): ZodiacSign {
  const [, mStr, dStr] = birthDateISO.split('-')
  const md = parseInt(mStr, 10) * 100 + parseInt(dStr, 10) // e.g. April 15 -> 415

  if (md >= 1222 || md <= 119) return 'Capricorn'   // Dec 22 – Jan 19
  if (md <= 218) return 'Aquarius'                   // Jan 20 – Feb 18
  if (md <= 320) return 'Pisces'                     // Feb 19 – Mar 20
  if (md <= 419) return 'Aries'                      // Mar 21 – Apr 19
  if (md <= 520) return 'Taurus'                     // Apr 20 – May 20
  if (md <= 620) return 'Gemini'                     // May 21 – Jun 20
  if (md <= 722) return 'Cancer'                     // Jun 21 – Jul 22
  if (md <= 822) return 'Leo'                        // Jul 23 – Aug 22
  if (md <= 922) return 'Virgo'                      // Aug 23 – Sep 22
  if (md <= 1022) return 'Libra'                     // Sep 23 – Oct 22
  if (md <= 1121) return 'Scorpio'                   // Oct 23 – Nov 21
  return 'Sagittarius'                               // Nov 22 – Dec 21
}
