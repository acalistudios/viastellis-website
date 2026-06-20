/**
 * MoonPhase — renders the current moon as an SVG disc with the correct
 * illuminated fraction and waxing/waning side. The phase itself is global
 * (location-independent), computed from the Sun–Moon elongation in panchanga.
 */

interface Props {
  /** Illuminated fraction, 0–100. */
  illumination: number
  /** Phase name, e.g. "Waxing Crescent" — used to pick the lit side. */
  name: string
  size?: number
  className?: string
}

/** SVG path for the lit region of a moon of radius R. */
function litPath(R: number, k: number, waxing: boolean): string {
  if (k <= 0.01) return '' // new moon — nothing lit
  if (k >= 0.99) {
    // full disc
    return `M0,${-R} A${R},${R} 0 1 0 0,${R} A${R},${R} 0 1 0 0,${-R} Z`
  }
  const rx = R * Math.abs(1 - 2 * k)
  // Lit-side limb: right semicircle for waxing (sweep 1), left for waning (sweep 0).
  const limbSweep = waxing ? 1 : 0
  // Terminator ellipse: sweep flips between crescent (k<0.5) and gibbous (k>0.5).
  const gibbous = k > 0.5
  // Terminator sweep — verified against rendered phases (crescent = thin sliver).
  const termSweep = waxing ? (gibbous ? 1 : 0) : (gibbous ? 0 : 1)
  return `M0,${-R} A${R},${R} 0 0 ${limbSweep} 0,${R} A${rx},${R} 0 0 ${termSweep} 0,${-R} Z`
}

export function MoonPhase({ illumination, name, size = 56, className = '' }: Props) {
  const R = 48 // viewBox radius
  const k = Math.max(0, Math.min(1, illumination / 100))
  const waxing = !/waning|last quarter/i.test(name)
  const path = litPath(R, k, waxing)

  return (
    <svg
      viewBox="-50 -50 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`${name}, ${illumination}% illuminated`}
    >
      <defs>
        <radialGradient id="moonLit" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="0.7" stopColor="#fde68a" />
          <stop offset="1" stopColor="#e9d8a6" />
        </radialGradient>
      </defs>
      {/* dark moon disc */}
      <circle cx="0" cy="0" r={R} fill="#1a1333" stroke="#3d2d70" strokeWidth="1" />
      {/* lit portion */}
      {path && <path d={path} fill="url(#moonLit)" />}
      {/* subtle craters for texture (only show where likely lit) */}
      <g fill="#00000018">
        <circle cx="-14" cy="-10" r="5" />
        <circle cx="10" cy="6" r="7" />
        <circle cx="18" cy="-16" r="3.5" />
        <circle cx="-6" cy="20" r="4" />
      </g>
    </svg>
  )
}
