/**
 * Retrograde system — simplified retrograde indicators for upcoming months.
 *
 * For MVP, we use known retrograde windows (approximate) rather than
 * computing transit positions daily, which is too slow.
 *
 * In production, this would integrate with an ephemeris lookup table.
 */

import type { Planet } from '@/types'

/** The nine grahas — only planets go retrograde, not the Ascendant. */
type Graha = Exclude<Planet, 'Ascendant'>

interface UpcomingRetrograde {
  planet: Graha
  startsIn: number // days from now
  startDate: Date
  endDate: Date
  durationDays: number
  meaning: string
}

const RETROGRADE_MEANINGS: Record<Graha, string> = {
  Mercury: 'Communication review. Miscommunications likely; redoing contracts, revisiting conversations.',
  Venus: 'Relationship recalibration. Reassessing values, past lovers resurface, intimacy deepens.',
  Mars: 'Energy inward. Delayed action; anger turned inward; time to strategize, not launch.',
  Jupiter: 'Wisdom review. Rethinking beliefs, legal delays, educational paths shift.',
  Saturn: 'Discipline focus. Intense karmic lessons; inner work on limitations and responsibility.',
  Sun: 'Identity unclear. Ego needs recalibration; leadership questioned; clarity returns after.',
  Moon: 'Emotional processing. Internal emotional work; moods intense; intuition peaks.',
  Rahu: 'Ambition redirected. Obsessions loosen; refocus on true north-node direction.',
  Ketu: 'Release deepens. Letting go accelerates; wisdom from past-life knowing.',
}

/**
 * Approximate 2026 retrograde windows (starting point for MVP).
 * In production, integrate with Swiss Ephemeris or JPL data.
 */
const RETROGRADE_2026 = [
  { planet: 'Mercury' as Graha, start: [1, 14], end: [2, 3], duration: 20 },
  { planet: 'Venus' as Graha, start: [1, 1], end: [2, 11], duration: 41 },
  { planet: 'Mars' as Graha, start: [9, 18], end: [11, 27], duration: 70 },
  { planet: 'Saturn' as Graha, start: [7, 1], end: [9, 20], duration: 81 },
]

/**
 * Get retrogrades for the user (simplified for MVP).
 */
export function upcomingRetrogrades(
  from: Date = new Date(),
  monthsAhead: number = 12
): UpcomingRetrograde[] {
  const results: UpcomingRetrograde[] = []
  const cutoff = new Date(from.getTime() + monthsAhead * 30 * 86400000)

  for (const retrograde of RETROGRADE_2026) {
    const [startMonth, startDay] = retrograde.start
    const [endMonth, endDay] = retrograde.end

    // Construct dates (assume 2026)
    const startDate = new Date(2026, startMonth - 1, startDay, 12, 0, 0)
    const endDate = new Date(2026, endMonth - 1, endDay, 12, 0, 0)

    // Only include if it falls within the window from user's 'now' to monthsAhead
    if (startDate >= from && startDate <= cutoff) {
      const startsIn = Math.ceil((startDate.getTime() - from.getTime()) / 86400000)
      results.push({
        planet: retrograde.planet,
        startsIn,
        startDate,
        endDate,
        durationDays: retrograde.duration,
        meaning: RETROGRADE_MEANINGS[retrograde.planet],
      })
    }
  }

  return results.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
}
