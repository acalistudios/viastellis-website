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
import { CELEBRITIES, type Celebrity } from '@/data/celebrities'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'
import type { BirthData } from '@/types'

interface MatchPersonDraft {
  name: string
  date: string
  time: string
  cityQuery: string
  cityResults: CityResult[]
  city: CityResult | null
}

function emptyPersonDraft(): MatchPersonDraft {
  return {
    name: '',
    date: '',
    time: '',
    cityQuery: '',
    cityResults: [],
    city: null,
  }
}

function cityFromCelebrity(celebrity: Celebrity): CityResult {
  return {
    display_name: `${celebrity.city}, ${celebrity.country}`,
    city: celebrity.city,
    country: celebrity.country,
    latitude: celebrity.latitude,
    longitude: celebrity.longitude,
  }
}

function decodeInvite(d: string | null): BirthData | null {
  if (!d) return null
  try {
    const b64url = d.replace(/-/g, '+').replace(/_/g, '/')
    const b64 = b64url + '='.repeat((4 - (b64url.length % 4)) % 4)
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

  const [personA, setPersonA] = useState<MatchPersonDraft>(() => emptyPersonDraft())
  const [personB, setPersonB] = useState<MatchPersonDraft>(() => emptyPersonDraft())
  const [publicVibe, setPublicVibe] = useState<VibeResult | null>(null)
  const [publicNames, setPublicNames] = useState<{ a: string; b: string } | null>(null)
  const [publicWorking, setPublicWorking] = useState(false)
  const publicDebounceARef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const publicDebounceBRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<CityResult[]>([])
  const [city, setCity] = useState<CityResult | null>(null)
  const [vibe, setVibe] = useState<VibeResult | null>(null)
  const [working, setWorking] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function updatePublicPerson(which: 'a' | 'b', patch: Partial<MatchPersonDraft>) {
    if (which === 'a') setPersonA(prev => ({ ...prev, ...patch }))
    else setPersonB(prev => ({ ...prev, ...patch }))
    setPublicVibe(null)
  }

  function handlePublicCityChange(which: 'a' | 'b', value: string) {
    updatePublicPerson(which, { cityQuery: value, city: null })
    const ref = which === 'a' ? publicDebounceARef : publicDebounceBRef
    if (ref.current) clearTimeout(ref.current)
    ref.current = setTimeout(async () => {
      if (value.trim().length < 2) {
        updatePublicPerson(which, { cityResults: [] })
        return
      }
      try {
        updatePublicPerson(which, { cityResults: await searchCities(value) })
      } catch { /* non-fatal */ }
    }, 400)
  }

  function birthDataFromDraft(draft: MatchPersonDraft): BirthData | null {
    if (!draft.name.trim() || !draft.date || !draft.city) return null
    return {
      name: draft.name.trim(),
      date: draft.date,
      time: draft.time || '12:00',
      time_unknown: !draft.time,
      city: draft.city.city,
      country: draft.city.country,
      latitude: draft.city.latitude,
      longitude: draft.city.longitude,
      timezone: getTimezone(draft.city.latitude, draft.city.longitude),
    }
  }

  async function handlePublicSubmit(e: FormEvent) {
    e.preventDefault()
    const a = birthDataFromDraft(personA)
    const b = birthDataFromDraft(personB)
    if (!a || !b) return

    setPublicWorking(true)
    try {
      setPublicVibe(computeVibeScore(calculateNatalChart(a), calculateNatalChart(b)))
      setPublicNames({ a: a.name, b: b.name })
    } finally {
      setPublicWorking(false)
    }
  }

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
    const today = new Date().toISOString().split('T')[0]
    const publicReady = Boolean(personA.name.trim() && personA.date && personA.city && personB.name.trim() && personB.date && personB.city)

    return (
      <div className="min-h-screen bg-cosmos-950 px-6 py-10 flex flex-col items-center">
        <div className="w-full max-w-2xl">
          <Link to="/" aria-label="ViaStellis home" className="inline-flex items-center gap-2 text-stardust-300 font-display text-lg mb-8">
            <img src="/logo.svg" alt="" className="w-7 h-7" />
            ViaStellis
          </Link>

          <div className="text-center mb-8">
            <h1 className="font-display text-4xl text-stardust-300 mb-3">Free Compatibility Match</h1>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
              Enter two birth profiles to see a no-login Vibe Score. Create a free account when
              you want your full birth chart, saved matches, Stella's deeper reading, and celebrity comparisons.
            </p>
          </div>

          <form onSubmit={handlePublicSubmit} className="grid md:grid-cols-2 gap-4 mb-6">
            <PublicPersonFields
              label="Person A"
              draft={personA}
              today={today}
              celebrities={CELEBRITIES}
              onChange={(patch) => updatePublicPerson('a', patch)}
              onCityChange={(value) => handlePublicCityChange('a', value)}
              onChooseCity={(city) => updatePublicPerson('a', { city, cityQuery: city.display_name, cityResults: [] })}
            />
            <PublicPersonFields
              label="Person B"
              draft={personB}
              today={today}
              celebrities={CELEBRITIES}
              onChange={(patch) => updatePublicPerson('b', patch)}
              onCityChange={(value) => handlePublicCityChange('b', value)}
              onChooseCity={(city) => updatePublicPerson('b', { city, cityQuery: city.display_name, cityResults: [] })}
            />

            <div className="md:col-span-2">
              <Button type="submit" size="lg" isLoading={publicWorking} disabled={!publicReady} className="w-full">
                ✨ Reveal Our Vibe
              </Button>
            </div>
          </form>

          {publicVibe && publicNames && (
            <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl p-6 text-center mb-6">
              <p className="text-slate-400 text-sm mb-3">{publicNames.a} + {publicNames.b}</p>
              <p className="text-6xl font-display text-stardust-300">{publicVibe.score}</p>
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-1 mb-4">Vibe Score / 100</p>
              <div className="h-2 bg-cosmos-800 rounded-full mb-5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-stardust-400 to-stellar-300 rounded-full"
                  style={{ width: `${publicVibe.score}%` }} />
              </div>
              <div className="flex flex-col gap-1.5 text-left text-sm mb-6 max-w-sm mx-auto">
                <p className="text-slate-300"><span className="text-stardust-400">☽ Moons:</span> {publicVibe.moon.label}</p>
                <p className="text-slate-300"><span className="text-stardust-400">☉ Suns:</span> {publicVibe.sun.label}</p>
                <p className="text-slate-300"><span className="text-stardust-400">♀♂ Spark:</span> {publicVibe.venusMars.label}</p>
              </div>
              <Link to="/auth">
                <Button size="lg">Get my full chart free</Button>
              </Link>
              <p className="text-slate-600 text-[11px] mt-3">
                Your free account includes the full chart that makes compatibility personal.
              </p>
            </div>
          )}

          <p className="text-[10px] text-slate-600 text-center max-w-sm mx-auto">{ENTERTAINMENT_DISCLAIMER}</p>
        </div>
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
              <Button size="lg">Get my full chart free</Button>
            </Link>
            <p className="text-slate-600 text-[11px] mt-3">
              Create an account for the full chart and Stella's deeper reading of this match.
            </p>
          </div>
        )}

        <p className="text-[10px] text-slate-600 text-center mt-8 max-w-xs mx-auto">{ENTERTAINMENT_DISCLAIMER}</p>
      </div>
    </div>
  )
}

interface PublicPersonFieldsProps {
  label: string
  draft: MatchPersonDraft
  today: string
  celebrities: Celebrity[]
  onChange: (patch: Partial<MatchPersonDraft>) => void
  onCityChange: (value: string) => void
  onChooseCity: (city: CityResult) => void
}

function PublicPersonFields({ label, draft, today, celebrities, onChange, onCityChange, onChooseCity }: PublicPersonFieldsProps) {
  function fillCelebrity(value: string) {
    const celebrity = celebrities.find(c => c.name === value)
    if (!celebrity) return
    const city = cityFromCelebrity(celebrity)
    onChange({
      name: celebrity.name,
      date: celebrity.date,
      time: '',
      city,
      cityQuery: city.display_name,
      cityResults: [],
    })
  }

  return (
    <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl p-4">
      <h2 className="font-display text-xl text-stardust-300 mb-4">{label}</h2>
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Use celebrity
          </label>
          <select
            value=""
            onChange={e => fillCelebrity(e.target.value)}
            className="w-full bg-cosmos-800 border border-cosmos-600 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none focus:border-stardust-400"
          >
            <option value="">Choose a celebrity...</option>
            {celebrities.map(c => (
              <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>
            ))}
          </select>
          <p className="text-[10px] text-slate-600 mt-1.5">
            Fills birthday and birthplace only; birth time stays blank.
          </p>
        </div>

        <Input label="Name" value={draft.name} onChange={e => onChange({ name: e.target.value })} required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Birth date" type="date" value={draft.date} max={today}
            onChange={e => onChange({ date: e.target.value })} required className="[color-scheme:dark]" />
          <Input label="Time (optional)" type="time" value={draft.time}
            onChange={e => onChange({ time: e.target.value })} className="[color-scheme:dark]" />
        </div>
        <div className="relative">
          <Input label="Birth city" placeholder="Type a city…" value={draft.cityQuery}
            onChange={e => onCityChange(e.target.value)} autoComplete="off" required />
          {draft.cityResults.length > 0 && !draft.city && (
            <ul className="absolute z-20 mt-1 w-full bg-cosmos-800 border border-cosmos-600 rounded-xl overflow-hidden shadow-2xl">
              {draft.cityResults.map((r, i) => (
                <li key={i}
                  onClick={() => onChooseCity(r)}
                  className="px-4 py-3 text-sm text-slate-300 hover:bg-cosmos-700 cursor-pointer border-b border-cosmos-700 last:border-0">
                  {r.display_name}
                </li>
              ))}
            </ul>
          )}
          {draft.city && <p className="text-xs text-emerald-400 mt-1.5">✓ {draft.city.display_name}</p>}
        </div>
      </div>
    </div>
  )
}
