/**
 * HoroscopeSection — the daily horoscope lenses inside "Today for you".
 *
 * The user's default lens (set at onboarding / in Settings) is free every day.
 * Other generic lenses cost 1 credit; the personalized lens costs 2. Premium
 * unlocks all. Unlocking is cached server-side per day, so re-views are free.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@/store/UserContext'
import { westernSunSign } from '@/lib/westernSign'
import { getHoroscope, type HoroscopeLens } from '@/lib/horoscope'
import type { NatalChart } from '@/types'

interface Props {
  chart: NatalChart
  /** Short factual summary of today's sky for the personalized reading. */
  transitSummary: string
}

const META: Record<HoroscopeLens, { emoji: string; title: string; tag: string }> = {
  western_sun: { emoji: '☀️', title: 'Sun', tag: 'Western' },
  vedic_moon: { emoji: '🌙', title: 'Moon', tag: 'Vedic' },
  vedic_sun: { emoji: '✶', title: 'Sun', tag: 'Vedic' },
  personalized: { emoji: '✨', title: 'Personalized', tag: 'Your chart' },
}

export function HoroscopeSection({ chart, transitSummary }: Props) {
  const { profile } = useUser()
  const defaultLens = (profile?.default_horoscope_lens ?? 'western_sun') as HoroscopeLens
  const isPremium = profile?.subscription_tier === 'premium'

  const moonSign = chart.planets.find((p) => p.planet === 'Moon')?.sign
  const sunSign = chart.planets.find((p) => p.planet === 'Sun')?.sign
  const rising = chart.birth_data.time_unknown ? undefined : chart.ascendant.sign
  const western = westernSunSign(chart.birth_data.date)

  const signFor = (lens: HoroscopeLens) =>
    lens === 'western_sun' ? western : lens === 'vedic_moon' ? moonSign : lens === 'vedic_sun' ? sunSign : undefined

  const costFor = (lens: HoroscopeLens) => (lens === 'personalized' ? 2 : lens === defaultLens ? 0 : 1)

  const [active, setActive] = useState<HoroscopeLens>(defaultLens)
  const [bodies, setBodies] = useState<Partial<Record<HoroscopeLens, string>>>({})
  const [lockedCost, setLockedCost] = useState<Partial<Record<HoroscopeLens, number>>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load(lens: HoroscopeLens, unlock = false) {
    setError('')
    if (bodies[lens] && !unlock) return
    setLoading(true)
    try {
      const res = await getHoroscope({
        lens,
        sign: signFor(lens),
        context:
          lens === 'personalized' && sunSign && moonSign
            ? { sun: sunSign, moon: moonSign, rising, transits: transitSummary, name: chart.birth_data.name }
            : undefined,
        unlock,
      })
      if (res.locked) {
        setLockedCost((p) => ({ ...p, [lens]: res.cost ?? 1 }))
      } else if (res.body) {
        setBodies((p) => ({ ...p, [lens]: res.body }))
        setLockedCost((p) => {
          const n = { ...p }
          delete n[lens]
          return n
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your horoscope.')
    } finally {
      setLoading(false)
    }
  }

  // Load the default (free) lens on mount.
  useEffect(() => {
    void load(defaultLens)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLens])

  function selectLens(lens: HoroscopeLens) {
    setActive(lens)
    if (!bodies[lens] && lockedCost[lens] == null) void load(lens)
  }

  const body = bodies[active]
  const cost = lockedCost[active]

  return (
    <div className="mt-4 pt-4 border-t border-cosmos-800">
      <p className="text-[11px] uppercase tracking-widest text-stardust-400 mb-2">Today’s Horoscope</p>

      {/* Lens tabs */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(Object.keys(META) as HoroscopeLens[]).map((lens) => {
          const m = META[lens]
          const free = isPremium || lens === defaultLens || bodies[lens] != null
          const isActive = active === lens
          return (
            <button
              key={lens}
              onClick={() => selectLens(lens)}
              className={[
                'text-[11px] rounded-full px-2.5 py-1 border transition-colors inline-flex items-center gap-1',
                isActive
                  ? 'bg-stardust-400/20 border-stardust-400/50 text-stardust-200'
                  : 'bg-cosmos-800 border-cosmos-700 text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              <span>{m.emoji}</span>
              <span>{m.title}</span>
              <span className="opacity-50">· {m.tag}</span>
              {!free && <span className="text-stellar-300">🔒{costFor(lens)}</span>}
            </button>
          )
        })}
      </div>

      {/* Descriptor for the active lens */}
      <p className="text-slate-500 text-xs italic mb-2">
        {active === 'personalized'
          ? 'Personalized horoscope based on your full Vedic chart — your Moon, Sun, and Lagna, woven with today’s transits.'
          : `Today’s ${META[active].tag} ${META[active].title}-sign reading${signFor(active) ? ` · ${signFor(active)}` : ''}.`}
      </p>

      {/* Body */}
      {loading && !body ? (
        <p className="text-slate-500 text-xs">Reading the sky…</p>
      ) : body ? (
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{body}</p>
      ) : cost != null ? (
        <div className="text-center bg-cosmos-800/50 border border-cosmos-700 rounded-xl px-4 py-4">
          <button
            onClick={() => void load(active, true)}
            disabled={loading}
            className="text-xs font-medium rounded-full px-4 py-1.5 bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 disabled:opacity-60"
          >
            {loading ? 'Unlocking…' : `Unlock for ${cost} credit${cost === 1 ? '' : 's'}`}
          </button>
          <p className="text-[10px] text-slate-600 mt-2">
            Free on <Link to="/upgrade" className="underline">Premium</Link>
          </p>
        </div>
      ) : null}

      {error && (
        <p className="text-rose-400 text-xs mt-2">
          {error}{' '}
          {error.includes('credit') && <Link to="/upgrade" className="underline">Get credits</Link>}
        </p>
      )}
    </div>
  )
}
