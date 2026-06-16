/**
 * Gemstone recommendations — Vedic gem therapy aligned with chart.
 *
 * Each planet has an associated gemstone that strengthens that planet's energy.
 * We recommend gems for:
 * 1. Weak planets (debilitated, combust, far from exaltation)
 * 2. Planets in challenging houses
 * 3. Planets aspecting difficult transits
 */

import type { NatalChart, Planet } from '@/types'

/** The nine grahas — gemstone therapy applies to planets, not the Ascendant. */
type Graha = Exclude<Planet, 'Ascendant'>

const DEBILITATIONS: Record<Graha, string> = {
  Sun: 'Libra',
  Moon: 'Scorpio',
  Mercury: 'Pisces',
  Venus: 'Virgo',
  Mars: 'Cancer',
  Jupiter: 'Capricorn',
  Saturn: 'Aries',
  Rahu: 'Sagittarius',
  Ketu: 'Gemini',
}

const GEMSTONE_DATA: Record<
  Graha,
  { primary: string; secondary: string; color: string; benefit: string }
> = {
  Sun: {
    primary: 'Ruby',
    secondary: 'Garnet',
    color: 'Deep red',
    benefit: 'Power, confidence, authority, leadership, father relationship',
  },
  Moon: {
    primary: 'Pearl',
    secondary: 'Moonstone',
    color: 'White/cream',
    benefit: 'Emotional stability, intuition, mother relationship, mind peace',
  },
  Mercury: {
    primary: 'Emerald',
    secondary: 'Peridot',
    color: 'Green',
    benefit: 'Communication, intellect, business success, learning, wit',
  },
  Venus: {
    primary: 'Diamond',
    secondary: 'White Sapphire',
    color: 'Clear/white',
    benefit: 'Love, beauty, luxury, artistic talent, relationship harmony',
  },
  Mars: {
    primary: 'Red Coral',
    secondary: 'Carnelian',
    color: 'Orange-red',
    benefit: 'Courage, vitality, passion, aggression channeling, competition',
  },
  Jupiter: {
    primary: 'Yellow Sapphire',
    secondary: 'Topaz',
    color: 'Golden yellow',
    benefit: 'Wisdom, wealth, luck, education, spiritual growth',
  },
  Saturn: {
    primary: 'Blue Sapphire',
    secondary: 'Amethyst',
    color: 'Deep blue',
    benefit: 'Discipline, karma working, longevity, protection from loss',
  },
  Rahu: {
    primary: 'Hessonite (Gomed)',
    secondary: 'Smoky Quartz',
    color: 'Golden brown',
    benefit: 'Grounding, focus on goals, illusion clarity, worldly success',
  },
  Ketu: {
    primary: 'Cat\'s Eye',
    secondary: 'Labradorite',
    color: 'Golden brown with stripe',
    benefit: 'Spiritual insight, past-life wisdom, psychic protection',
  },
}

export interface GemstoneRecommendation {
  planet: Graha
  gem: string
  color: string
  benefit: string
  reason: string
  wearingTips: string[]
}

/** Assess if a planet is weak/afflicted in the chart. */
function isPlanetWeak(chart: NatalChart, planet: Graha): boolean {
  const p = chart.planets.find(pl => pl.planet === planet)
  if (!p) return false

  // Debilitated (opposite of exaltation)
  if (p.sign === DEBILITATIONS[planet]) return true

  // In challenging houses (6, 8, 12)
  if ([6, 8, 12].includes(p.house)) return true

  // Retrograde (has inward energy, may feel weak externally)
  if (p.retrograde) return true

  return false
}

/**
 * Get gemstone recommendations based on chart analysis.
 * Recommends gems for weak or afflicted planets.
 */
export function getGemstoneRecommendations(chart: NatalChart): GemstoneRecommendation[] {
  const recommendations: GemstoneRecommendation[] = []
  const planets: Graha[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu']

  for (const planet of planets) {
    if (!isPlanetWeak(chart, planet)) continue

    const p = chart.planets.find(pl => pl.planet === planet)
    if (!p) continue

    const gem = GEMSTONE_DATA[planet]
    let reason = ''

    if (p.sign === DEBILITATIONS[planet]) {
      reason = `${planet} is debilitated in ${p.sign} — wearing ${gem.primary} will strengthen this planet's energy.`
    } else if ([6, 8, 12].includes(p.house)) {
      reason = `${planet} in house ${p.house} (challenging placement) — ${gem.primary} helps channel this energy constructively.`
    } else if (p.retrograde) {
      reason = `${planet} is retrograde — ${gem.primary} helps integrate this inward energy.`
    }

    recommendations.push({
      planet,
      gem: gem.primary,
      color: gem.color,
      benefit: gem.benefit,
      reason,
      wearingTips: [
        `Wear as a ring on the appropriate finger (or as pendant/bracelet).`,
        `Best worn on days ruled by this planet: ${getPlanetDay(planet)}.`,
        `Minimum carat: 1-2 carats (consult astrologer for exact weight).`,
        `Energize the gem under moonlight or perform a puja before first wear.`,
        `Wear continuously for at least 40 days to feel the effect.`,
      ],
    })
  }

  return recommendations
}

function getPlanetDay(planet: Graha): string {
  const days: Record<Graha, string> = {
    Sun: 'Sunday',
    Moon: 'Monday',
    Mercury: 'Wednesday',
    Venus: 'Friday',
    Mars: 'Tuesday',
    Jupiter: 'Thursday',
    Saturn: 'Saturday',
    Rahu: 'Wednesday',
    Ketu: 'Saturday',
  }
  return days[planet]
}

/** Get the primary and secondary gem for a planet (for general info). */
export function getGemForPlanet(planet: Graha): { primary: string; secondary: string } {
  return {
    primary: GEMSTONE_DATA[planet].primary,
    secondary: GEMSTONE_DATA[planet].secondary,
  }
}
