/**
 * North Indian style kundali (diamond chart) — pure SVG, no dependencies.
 *
 * Layout: fixed houses. House 1 is always the top-center diamond; the rashi
 * number rotates depending on the ascendant. Planets render inside their house.
 */

import { navamsaChart } from '@/lib/varga'
import type { NatalChart, Planet } from '@/types'

const PLANET_ABBR: Record<Planet, string> = {
  Sun: 'Su', Moon: 'Mo', Mercury: 'Me', Venus: 'Ve', Mars: 'Ma',
  Jupiter: 'Ju', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke', Ascendant: 'As',
}

// Center coordinates for each house's content in a 400×400 viewBox.
// Index 0 = house 1 (top-center diamond), proceeding counter-clockwise
// per North Indian convention.
const HOUSE_CENTERS: Array<[number, number]> = [
  [200, 105], // 1  top-center diamond
  [100, 52],  // 2  top-left triangle
  [52, 100],  // 3  left-top triangle
  [105, 200], // 4  left-center diamond
  [52, 300],  // 5  left-bottom triangle
  [100, 348], // 6  bottom-left triangle
  [200, 295], // 7  bottom-center diamond
  [300, 348], // 8  bottom-right triangle
  [348, 300], // 9  right-bottom triangle
  [295, 200], // 10 right-center diamond
  [348, 100], // 11 right-top triangle
  [300, 52],  // 12 top-right triangle
]

// Rashi-number label offsets (closer to the house's inner corner)
const RASHI_LABELS: Array<[number, number]> = [
  [200, 160], [100, 18],  [18, 100],  [160, 200],
  [18, 300],  [100, 382], [200, 350], [300, 382],
  [382, 300], [350, 200], [382, 100], [300, 18],
]

interface Props {
  chart: NatalChart
  /** D1 = rashi chart (default), D9 = navamsa */
  variant?: 'D1' | 'D9'
  className?: string
}

export function NorthIndianChart({ chart, variant = 'D1', className }: Props) {
  const timeUnknown = chart.birth_data.time_unknown

  // House 1 sign: the ascendant — or Chandra Lagna (Moon's sign as house 1)
  // when birth time is unknown, per standard Vedic practice.
  const SIGNS_ORDER = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ]

  let ascSignIdx: number
  const byHouse = new Map<number, string[]>()

  if (variant === 'D9') {
    const d9 = navamsaChart(chart)
    const refSign = d9.lagnaSign ?? d9.planets.find(p => p.planet === 'Moon')!.sign
    ascSignIdx = SIGNS_ORDER.indexOf(refSign)
    for (const p of d9.planets) {
      const list = byHouse.get(p.house) ?? []
      list.push(`${PLANET_ABBR[p.planet]}${p.retrograde ? '℞' : ''}`)
      byHouse.set(p.house, list)
    }
  } else {
    const moonSign = chart.planets.find(p => p.planet === 'Moon')?.sign ?? 'Aries'
    ascSignIdx = timeUnknown
      ? SIGNS_ORDER.indexOf(moonSign)
      : SIGNS_ORDER.indexOf(chart.ascendant.sign)

    for (const p of chart.planets) {
      if (p.planet === 'Ascendant') continue
      const house = timeUnknown
        ? ((SIGNS_ORDER.indexOf(p.sign) - ascSignIdx + 12) % 12) + 1
        : p.house
      const list = byHouse.get(house) ?? []
      list.push(`${PLANET_ABBR[p.planet]}${p.retrograde ? '℞' : ''}`)
      byHouse.set(house, list)
    }
  }

  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      role="img"
      aria-label={variant === 'D9' ? 'Navamsa (D9) chart' : 'North Indian style birth chart'}
    >
      {/* Frame */}
      <rect x="2" y="2" width="396" height="396" rx="8"
        fill="none" stroke="var(--color-cosmos-600, #3d2d70)" strokeWidth="2" />
      {/* Diagonals */}
      <line x1="2" y1="2" x2="398" y2="398" stroke="var(--color-cosmos-600, #3d2d70)" strokeWidth="1.5" />
      <line x1="398" y1="2" x2="2" y2="398" stroke="var(--color-cosmos-600, #3d2d70)" strokeWidth="1.5" />
      {/* Inner rotated square */}
      <polygon points="200,2 398,200 200,398 2,200"
        fill="none" stroke="var(--color-cosmos-600, #3d2d70)" strokeWidth="1.5" />

      {/* Houses */}
      {HOUSE_CENTERS.map(([cx, cy], i) => {
        const houseNum = i + 1
        const rashiNum = ((ascSignIdx + i) % 12) + 1
        const planets = byHouse.get(houseNum) ?? []
        const [rx, ry] = RASHI_LABELS[i]

        return (
          <g key={houseNum}>
            {/* Rashi number */}
            <text x={rx} y={ry + 4} textAnchor="middle"
              fontSize="11" fill="var(--color-stellar-400, #f59e0b)" opacity="0.8">
              {rashiNum}
            </text>
            {/* Planets — stacked lines, max 3 per row */}
            {planets.map((label, j) => {
              const row = Math.floor(j / 2)
              const col = j % 2
              const total = Math.min(planets.length - row * 2, 2)
              const xOff = total === 1 ? 0 : col === 0 ? -16 : 16
              return (
                <text
                  key={label + j}
                  x={cx + xOff}
                  y={cy + row * 14 - (planets.length > 2 ? 7 : 0)}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="600"
                  fill="var(--color-stardust-300, #c4b5fd)"
                >
                  {label}
                </text>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}
