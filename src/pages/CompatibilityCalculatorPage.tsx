/**
 * CompatibilityCalculatorPage — public, no-signup compatibility tool.
 * `/compatibility-calculator` (the in-app /compatibility is auth-gated).
 *
 * SEO + top-of-funnel: ranks for "astrology compatibility calculator / zodiac
 * compatibility / love match". Uses the SAME verified Vedic engine + vibe score
 * the app uses (computeVibeScore) — a Moon-sign + nakshatra based reading, which
 * is the heart of Vedic kundli matching. We do NOT claim a 36-guna Ashtakoot
 * score (we don't compute one) — for that tradition we link the Guna Milan guide.
 */

import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { Starfield } from '@/components/ui/Starfield'
import { calculateNatalChart } from '@/lib/ephemeris'
import { computeVibeScore, type VibeResult } from '@/lib/vibe'
import { searchCities, getTimezone, type CityResult } from '@/lib/geocoding'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'
import type { BirthData } from '@/types'

interface PersonState {
  name: string
  date: string
  time: string
  timeUnknown: boolean
  cityQuery: string
  cityResults: CityResult[]
  city: CityResult | null
}
const emptyPerson = (): PersonState => ({
  name: '', date: '', time: '', timeUnknown: false, cityQuery: '', cityResults: [], city: null,
})

function toBirthData(p: PersonState, fallbackName: string): BirthData {
  const c = p.city!
  return {
    name: p.name.trim() || fallbackName,
    date: p.date,
    time: p.timeUnknown ? '12:00' : (p.time || '12:00'),
    time_unknown: p.timeUnknown || !p.time,
    city: c.city, country: c.country,
    latitude: c.latitude, longitude: c.longitude,
    timezone: getTimezone(c.latitude, c.longitude),
  }
}

export function CompatibilityCalculatorPage() {
  const [a, setA] = useState<PersonState>(emptyPerson)
  const [b, setB] = useState<PersonState>(emptyPerson)
  const [result, setResult] = useState<VibeResult | null>(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!a.date || !a.city || !b.date || !b.city) {
      setError('Please enter a birth date and city for both people.')
      return
    }
    setWorking(true)
    try {
      const vibe = computeVibeScore(
        calculateNatalChart(toBirthData(a, 'Person A')),
        calculateNatalChart(toBirthData(b, 'Person B')),
      )
      setResult(vibe)
    } catch {
      setError('Something went wrong. Double-check both dates and cities.')
    } finally {
      setWorking(false)
    }
  }

  const scoreColor = result && result.score >= 70 ? 'text-emerald-300'
    : result && result.score >= 45 ? 'text-stellar-300' : 'text-rose-300'

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0817] via-[#1a1a3f] to-[#0a0e27] text-slate-100 relative overflow-hidden">
      <Seo
        title="Free Astrology Compatibility Calculator (Vedic Moon-Sign Match)"
        description="Check your compatibility with anyone by birth date — a Vedic Moon-sign and nakshatra based love match with a score and breakdown. Free, instant, no sign-up."
        path="/compatibility-calculator"
      />
      <Starfield count={90} />

      <div className="relative max-w-lg mx-auto px-5 py-10">
        <Link to="/" aria-label="ViaStellis home" className="inline-block mb-6">
          <img src="/logo.svg" alt="ViaStellis" className="w-12 h-12" />
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl text-stardust-200 leading-tight">
          Compatibility calculator
        </h1>
        <p className="text-slate-300 text-sm mt-2 mb-8 leading-relaxed">
          How do two charts click? Enter both birth dates for a Vedic
          Moon-sign &amp; nakshatra compatibility reading — the heart of{' '}
          <Link to="/learn/kundli-matching" className="text-stardust-300 underline">kundli matching</Link>.
          Free, instant, no account.
        </p>

        {!result && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <PersonFields label="You" person={a} onChange={patch => setA(s => ({ ...s, ...patch }))} />
            <PersonFields label="Them" person={b} onChange={patch => setB(s => ({ ...s, ...patch }))} />
            {error && <p className="text-rose-300 text-xs">{error}</p>}
            <button type="submit" disabled={working || !a.city || !b.city || !a.date || !b.date}
              className="w-full rounded-full bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-semibold py-3 disabled:opacity-50 transition-opacity">
              {working ? 'Reading the stars…' : '💫 Check compatibility'}
            </button>
          </form>
        )}

        {result && (
          <div className="space-y-5">
            <div className="text-center bg-cosmos-900/60 border border-cosmos-700 rounded-2xl px-5 py-6">
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Vibe score</p>
              <p className={`font-display text-5xl ${scoreColor}`}>{result.score}<span className="text-slate-600 text-2xl">/100</span></p>
            </div>

            <div className="bg-cosmos-900/60 border border-cosmos-700 rounded-2xl px-5 py-4 space-y-2.5">
              <Row label="☽ Moons" value={result.moon.label} />
              <Row label="☉ Suns" value={result.sun.label} />
              <Row label="♀♂ Spark" value={result.venusMars.label} />
              {result.communication && <Row label="☿ Communication" value={result.communication.label} />}
            </div>

            {result.highlights.length > 0 && (
              <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-2xl px-5 py-4">
                <p className="text-emerald-300 text-xs uppercase tracking-widest mb-2">Strengths</p>
                {result.highlights.map(h => <p key={h} className="text-slate-300 text-sm">• {h}</p>)}
              </div>
            )}
            {result.tensions.length > 0 && (
              <div className="bg-rose-400/5 border border-rose-400/20 rounded-2xl px-5 py-4">
                <p className="text-rose-300 text-xs uppercase tracking-widest mb-2">Growth areas</p>
                {result.tensions.map(t => <p key={t} className="text-slate-300 text-sm">• {t}</p>)}
              </div>
            )}

            <div className="bg-gradient-to-br from-cosmos-800/90 to-cosmos-900/90 border border-stardust-400/30 rounded-2xl px-5 py-5 text-center">
              <p className="text-slate-100 font-display text-lg mb-1">Want the full story?</p>
              <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                Create a free account for Stella's in-depth narrative reading of your connection —
                communication, values, friction and flow — plus your own full chart.
              </p>
              <Link to="/auth" className="inline-block rounded-full bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-semibold px-6 py-2.5">
                Get the full reading →
              </Link>
              <button onClick={() => setResult(null)} className="block mx-auto mt-3 text-slate-500 hover:text-slate-300 text-xs underline">
                Try another pairing
              </button>
            </div>
          </div>
        )}

        <p className="mt-8 text-[11px] text-slate-600 text-center">{ENTERTAINMENT_DISCLAIMER}</p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500 text-xs shrink-0">{label}</span>
      <span className="text-slate-200 text-sm text-right">{value}</span>
    </div>
  )
}

function PersonFields({ label, person, onChange }: {
  label: string
  person: PersonState
  onChange: (patch: Partial<PersonState>) => void
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleCity(value: string) {
    onChange({ cityQuery: value, city: null })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (value.trim().length < 2) { onChange({ cityResults: [] }); return }
      try { onChange({ cityResults: await searchCities(value) }) } catch { /* non-fatal */ }
    }, 400)
  }

  return (
    <div className="bg-cosmos-900/60 border border-cosmos-700 rounded-2xl p-4 space-y-3">
      <p className="text-xs uppercase tracking-widest text-stardust-300">{label}</p>
      <input value={person.name} onChange={e => onChange({ name: e.target.value })} placeholder="Name (optional)"
        className="w-full bg-cosmos-800 border border-cosmos-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-stardust-400 outline-none" />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={person.date} onChange={e => onChange({ date: e.target.value })}
          className="w-full bg-cosmos-800 border border-cosmos-700 rounded-lg px-2.5 py-2 text-sm text-slate-100 focus:border-stardust-400 outline-none" />
        <input type="time" value={person.time} disabled={person.timeUnknown} onChange={e => onChange({ time: e.target.value })}
          className="w-full bg-cosmos-800 border border-cosmos-700 rounded-lg px-2.5 py-2 text-sm text-slate-100 focus:border-stardust-400 outline-none disabled:opacity-40" />
      </div>
      <div className="relative">
        <input value={person.cityQuery} onChange={e => handleCity(e.target.value)} placeholder="Birth city…"
          className="w-full bg-cosmos-800 border border-cosmos-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-stardust-400 outline-none" />
        {person.cityResults.length > 0 && !person.city && (
          <ul className="absolute z-10 mt-1 w-full bg-cosmos-800 border border-cosmos-700 rounded-lg max-h-40 overflow-auto shadow-xl">
            {person.cityResults.map((c, i) => (
              <li key={i}>
                <button type="button" onClick={() => onChange({ city: c, cityQuery: c.display_name, cityResults: [] })}
                  className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-cosmos-700">{c.display_name}</button>
              </li>
            ))}
          </ul>
        )}
        {person.city && <p className="text-emerald-400 text-xs mt-1">✓ {person.city.display_name}</p>}
      </div>
    </div>
  )
}
