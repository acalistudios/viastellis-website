/**
 * MatchInvitePage — feature #13 (partner invite).
 *
 * Public route: /match?d=<base64url payload of the inviter's birth data>.
 * The recipient enters their own birth details; both charts and the vibe
 * score are computed entirely client-side (no account needed). Ends with
 * a sign-up CTA.
 */

import { useMemo, useState, useRef, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { calculateNatalChart } from '@/lib/ephemeris'
import { computeVibeScore, type VibeResult } from '@/lib/vibe'
import { searchCities, getTimezone, type CityResult } from '@/lib/geocoding'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'
import type { BirthData } from '@/types'

function decodeInvite(d: string | null): BirthData | null {
  if (!d) return null
  try {
    const b64 = d.replace(/-/g, '+').replace(/_/g, '/')
    // base64url → UTF-8 (mirrors the encoder, which byte-encodes before btoa).
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const raw = JSON.parse(new TextDecoder().decode(bytes))
    if (!raw.n || !raw.d || typeof raw.la !== 'number') return null
    return {
      name: String(raw.n),
      date: String(raw.d),
      time: raw.t ?? '12:00',
      time_unknown: !raw.t,
      city: String(raw.c ?? ''),
      country: String(raw.co ?? ''),
      latitude: raw.la,
      longitude: raw.lo,
      timezone: String(raw.tz ?? 'UTC'),
    }
  } catch {
    return null
  }
}

export function MatchInvitePage() {
  const [params] = useSearchParams()
  const inviter = useMemo(() => decodeInvite(params.get('d')), [params])

  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<CityResult[]>([])
  const [city, setCity] = useState<CityResult | null>(null)
  const [vibe, setVibe] = useState<VibeResult | null>(null)
  const [working, setWorking] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleCityChange(value: string) {
    setCityQuery(value)
    setCity(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (value.trim().length < 2) { setCityResults([]); return }
      try { setCityResults(await searchCities(value)) } catch { /* non-fatal */ }
    }, 400)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!inviter || !city || !date || !name.trim()) return
    setWorking(true)
    try {
      const timezone = getTimezone(city.latitude, city.longitude)
      const me: BirthData = {
        name: name.trim(),
        date,
        time: time || '12:00',
        time_unknown: !time,
        city: city.city,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
        timezone,
      }
      setVibe(computeVibeScore(calculateNatalChart(inviter), calculateNatalChart(me)))
    } finally {
      setWorking(false)
    }
  }

  if (!inviter) {
    return (
      <div className="min-h-screen bg-cosmos-950 flex flex-col items-center justify-center px-6 text-center">
        <Link to="/" aria-label="ViaStellis home">
          <img src="/logo.svg" alt="ViaStellis" className="w-16 h-16 mb-4 hover:scale-105 transition-transform" />
        </Link>
        <h1 className="font-display text-3xl text-stardust-300 mb-3">Compatibility invite</h1>
        <p className="text-slate-400 text-sm mb-2 max-w-sm">
          This page opens a personalized compatibility match when you follow an invite link a friend
          shares with you.
        </p>
        <p className="text-slate-500 text-xs mb-6 max-w-sm">
          It looks like this link is missing its invite details. Want to create your own chart and
          share a match instead?
        </p>
        <Link
          to="/"
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-semibold hover:shadow-lg hover:shadow-stardust-400/20 transition-all"
        >
          Explore ViaStellis
        </Link>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-cosmos-950 px-6 py-12 flex flex-col items-center">
      <h1 className="font-display text-3xl text-stardust-300 mb-1">ViaStellis</h1>
      <p className="text-slate-500 text-xs mb-8">Vibe Match invitation</p>

      <div className="w-full max-w-sm">
        {!vibe ? (
          <>
            <p className="text-slate-300 text-center mb-6">
              <span className="text-stardust-300">{inviter.name}</span> wants to see how your
              stars dance together ✨
              <br />
              <span className="text-slate-500 text-sm">Enter your birth details to find out.</span>
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input label="Your name" value={name} onChange={e => setName(e.target.value)} required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Birth date" type="date" value={date} max={today}
                  onChange={e => setDate(e.target.value)} required className="[color-scheme:dark]" />
                <Input label="Time (optional)" type="time" value={time}
                  onChange={e => setTime(e.target.value)} className="[color-scheme:dark]" />
              </div>
              <div className="relative">
                <Input label="Birth city" placeholder="Type a city…" value={cityQuery}
                  onChange={e => handleCityChange(e.target.value)} autoComplete="off" required />
                {cityResults.length > 0 && !city && (
                  <ul className="absolute z-20 mt-1 w-full bg-cosmos-800 border border-cosmos-600 rounded-xl overflow-hidden shadow-2xl">
                    {cityResults.map((r, i) => (
                      <li key={i}
                        onClick={() => { setCity(r); setCityQuery(r.display_name); setCityResults([]) }}
                        className="px-4 py-3 text-sm text-slate-300 hover:bg-cosmos-700 cursor-pointer border-b border-cosmos-700 last:border-0">
                        {r.display_name}
                      </li>
                    ))}
                  </ul>
                )}
                {city && <p className="text-xs text-emerald-400 mt-1.5">✓ {city.display_name}</p>}
              </div>
              <Button type="submit" size="lg" isLoading={working} disabled={!name.trim() || !date || !city}>
                ✨ Reveal Our Vibe
              </Button>
            </form>
          </>
        ) : (
          <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl p-6 text-center">
            <p className="text-slate-400 text-sm mb-3">{inviter.name} + {name.trim()}</p>
            <p className="text-6xl font-display text-stardust-300">{vibe.score}</p>
            <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-1 mb-4">Vibe Score / 100</p>
            <div className="h-2 bg-cosmos-800 rounded-full mb-5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-stardust-400 to-stellar-300 rounded-full"
                style={{ width: `${vibe.score}%` }} />
            </div>
            <div className="flex flex-col gap-1.5 text-left text-sm mb-6">
              <p className="text-slate-300"><span className="text-stardust-400">☽ Moons:</span> {vibe.moon.label}</p>
              <p className="text-slate-300"><span className="text-stardust-400">☉ Suns:</span> {vibe.sun.label}</p>
              <p className="text-slate-300"><span className="text-stardust-400">♀♂ Spark:</span> {vibe.venusMars.label}</p>
            </div>
            <Link to="/auth">
              <Button size="lg">Get your full chart — free</Button>
            </Link>
            <p className="text-slate-600 text-[11px] mt-3">
              Create an account for Stella's full AI reading of this match.
            </p>
          </div>
        )}

        <p className="text-[10px] text-slate-600 text-center mt-8 max-w-xs mx-auto">{ENTERTAINMENT_DISCLAIMER}</p>
      </div>
    </div>
  )
}
