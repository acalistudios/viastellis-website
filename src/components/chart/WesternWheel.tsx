/**
 * Western chart wheel — pure SVG, no dependencies.
 *
 * Standard orientation: the Ascendant sits at the left (9 o'clock) and ecliptic
 * longitude increases counter-clockwise, so the Descendant is on the right, the
 * MC near the top and the IC near the bottom. Rings (outer → in): zodiac signs,
 * planet glyphs (with true-position ticks), house cusps + numbers, and aspect
 * lines across the central disc.
 */
import type { AspectType, WesternBody, WesternChart } from '@/types'

const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']

const BODY_GLYPHS: Record<WesternBody, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  'North Node': '☊', 'South Node': '☋', Ascendant: 'Asc', Midheaven: 'MC',
}

// Harmonious aspects read cool/blue; hard aspects read warm/rose. Conjunctions
// are shown by glyph proximity, not a line (the endpoints would coincide).
const ASPECT_COLOR: Record<AspectType, string> = {
  trine: '#38bdf8',
  sextile: '#38bdf8',
  square: '#fb7185',
  opposition: '#fb7185',
  conjunction: 'transparent',
}

const CX = 200
const CY = 200
const R_OUTER = 192
const R_ZODIAC = 158   // inner edge of the sign band (glyphs sit between this and R_OUTER)
const R_TICK = 150     // true-position ticks start just inside the sign band
const R_PLANET = 130   // planet glyph ring
const R_HOUSE_NUM = 96
const R_INNER = 70     // house-cusp lines + aspect lines meet here

const LINE = 'var(--color-cosmos-600, #3d2d70)'
const SIGN_COLOR = 'var(--color-stellar-400, #f59e0b)'
const PLANET_COLOR = 'var(--color-stardust-300, #c4b5fd)'

interface Props {
  chart: WesternChart
  className?: string
}

export function WesternWheel({ chart, className }: Props) {
  const ascLon = chart.ascendant.longitude

  // Ecliptic longitude → SVG point. θ = 180 − (lon − asc) puts the Ascendant at
  // the left and increasing longitude counter-clockwise (SVG y grows downward).
  const point = (lon: number, r: number) => {
    const theta = ((180 - (lon - ascLon)) * Math.PI) / 180
    return { x: CX + r * Math.cos(theta), y: CY + r * Math.sin(theta) }
  }

  const cuspLon = (h: number) => chart.houses.find(c => c.house === h)?.longitude ?? 0

  // Spread planet glyphs so they don't overlap: sort by longitude and push each
  // out to a minimum separation. The true position is still marked by a tick.
  const bodies = chart.planets
    .filter(p => p.body !== 'Ascendant' && p.body !== 'Midheaven')
    .slice()
    .sort((a, b) => a.longitude - b.longitude)
  const MIN_SEP = 9
  const display: number[] = bodies.map(b => b.longitude)
  for (let i = 1; i < display.length; i++) {
    if (display[i] - display[i - 1] < MIN_SEP) display[i] = display[i - 1] + MIN_SEP
  }
  const posByBody = new Map<WesternBody, number>()
  bodies.forEach(b => posByBody.set(b.body, b.longitude))

  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label="Western natal chart wheel">
      {/* Rings */}
      <circle cx={CX} cy={CY} r={R_OUTER} fill="none" stroke={LINE} strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r={R_ZODIAC} fill="none" stroke={LINE} strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r={R_INNER} fill="none" stroke={LINE} strokeWidth="1" />

      {/* Zodiac: 12 sign sectors (dividers every 30° of absolute longitude) */}
      {Array.from({ length: 12 }, (_, s) => {
        const boundary = point(s * 30, R_OUTER)
        const boundaryIn = point(s * 30, R_ZODIAC)
        const glyph = point(s * 30 + 15, (R_OUTER + R_ZODIAC) / 2)
        return (
          <g key={`sign-${s}`}>
            <line x1={boundaryIn.x} y1={boundaryIn.y} x2={boundary.x} y2={boundary.y} stroke={LINE} strokeWidth="1" />
            <text x={glyph.x} y={glyph.y} textAnchor="middle" dominantBaseline="central" fontSize="15" fill={SIGN_COLOR} opacity="0.9">
              {SIGN_GLYPHS[s]}
            </text>
          </g>
        )
      })}

      {/* House cusps + numbers */}
      {Array.from({ length: 12 }, (_, i) => {
        const h = i + 1
        const start = cuspLon(h)
        const outer = point(start, R_ZODIAC)
        const inner = point(start, R_INNER)
        const isAngle = h === 1 || h === 10 // Ascendant / Midheaven
        const end = cuspLon(h === 12 ? 1 : h + 1)
        const span = ((end - start + 360) % 360) || 30
        const numPt = point(start + span / 2, R_HOUSE_NUM)
        return (
          <g key={`house-${h}`}>
            <line
              x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke={isAngle ? PLANET_COLOR : LINE}
              strokeWidth={isAngle ? 1.75 : 0.75}
              opacity={isAngle ? 0.9 : 0.7}
            />
            <text x={numPt.x} y={numPt.y} textAnchor="middle" dominantBaseline="central" fontSize="10" fill="#64748b">
              {h}
            </text>
          </g>
        )
      })}

      {/* Ascendant / Midheaven labels just inside the rim */}
      {([['Asc', 1], ['MC', 10]] as const).map(([label, h]) => {
        const p = point(cuspLon(h), R_OUTER - 9)
        return (
          <text key={label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
            fontSize="8" fontWeight="700" fill={PLANET_COLOR} opacity="0.85">
            {label}
          </text>
        )
      })}

      {/* Aspect lines across the central disc (conjunctions omitted) */}
      {chart.aspects.map((a, i) => {
        if (a.type === 'conjunction') return null
        const lonA = posByBody.get(a.a)
        const lonB = posByBody.get(a.b)
        if (lonA === undefined || lonB === undefined) return null
        const p1 = point(lonA, R_INNER)
        const p2 = point(lonB, R_INNER)
        return (
          <line key={`asp-${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke={ASPECT_COLOR[a.type]} strokeWidth="0.85" opacity="0.45" />
        )
      })}

      {/* Planets — true-position tick + spread glyph + degree */}
      {bodies.map((p, i) => {
        const truePt = point(p.longitude, R_TICK)
        const glyphPt = point(display[i], R_PLANET)
        return (
          <g key={p.body}>
            <line x1={truePt.x} y1={truePt.y} x2={glyphPt.x} y2={glyphPt.y} stroke={LINE} strokeWidth="0.6" opacity="0.7" />
            <circle cx={truePt.x} cy={truePt.y} r="1.3" fill={PLANET_COLOR} opacity="0.8" />
            <text x={glyphPt.x} y={glyphPt.y} textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="600" fill={PLANET_COLOR}>
              {BODY_GLYPHS[p.body]}
            </text>
            <text x={glyphPt.x} y={glyphPt.y + 11} textAnchor="middle" dominantBaseline="central" fontSize="7" fill="#64748b">
              {Math.floor(p.degree)}°{p.retrograde ? '℞' : ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
