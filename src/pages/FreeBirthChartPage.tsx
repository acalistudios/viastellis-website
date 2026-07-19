/**
 * FreeBirthChartPage — public, no-signup birth chart tool. `/free-birth-chart`
 *
 * SEO + top-of-funnel: ranks for "free birth chart / free kundli / free natal
 * chart", gives real value to logged-out visitors (their Big Three in BOTH
 * Vedic and Western, plus their Moon nakshatra — the Vedic hook), then converts
 * to signup for the full chart. Charts are computed entirely client-side with
 * the same engine the app uses (same pattern as the public /match page).
 */

import { useState, useRef, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { Starfield } from '@/components/ui/Starfield'
import { calculateNatalChart } from '@/lib/ephemeris'
import { calculateWesternChart } from '@/lib/westernChart'
import { searchCities, getTimezone, type CityResult } from '@/lib/geocoding'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'
import type { BirthData } from '@/types'

const SIGN_GLYPH: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
}

interface Result {
  name: string
  timeUnknown: boolean
  western: { sun?: string; moon?: string; rising?: string }
  vedic: { sun?: string; moon?: string; rising?: string; moonNakshatra?: string }
}

export function FreeBirthChartPage() {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<CityResult[]>([])
  const [city, setCity] = useState<CityResult | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
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
    setError('')
    if (!date || !city) { setError('Please enter your birth date and city.'); return }
    setWorking(true)
    try {
      const timezone = getTimezone(city.latitude, city.longitude)
      const birthData: BirthData = {
        name: name.trim() || 'You',
        date,
        time: timeUnknown ? '12:00' : (time || '12:00'),
        time_unknown: timeUnknown || !time,
        city: city.city,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
        timezone,
      }
      const vedic = calculateNatalChart(birthData)
      const western = calculateWesternChart(birthData)
      const unknown = birthData.time_unknown

      const vMoon = vedic.planets.find(p => p.planet === 'Moon')
      setResult({
        name: birthData.name,
        timeUnknown: unknown,
        western: {
          sun: western.planets.find(p => p.body === 'Sun')?.sign,
          moon: western.planets.find(p => p.body === 'Moon')?.sign,
          rising: unknown ? undefined : western.ascendant.sign,
        },
        vedic: {
          sun: vedic.planets.find(p => p.planet === 'Sun')?.sign,
          moon: vMoon?.sign,
          rising: unknown ? undefined : vedic.ascendant.sign,
          moonNakshatra: vMoon?.nakshatra,
        },
      })
    } catch {
      setError('Something went wrong computing your chart. Double-check your date and city.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0817] via-[#1a1a3f] to-[#0a0e27] text-slate-100 relative overflow-hidden">
      <Seo
        title="Free Birth Chart — Vedic & Western (No Sign-Up)"
        description="Get your free birth chart instantly in both Vedic and Western astrology. See your Sun, Moon and Rising signs, plus your Vedic Moon nakshatra — no account needed."
        path="/free-birth-chart"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Free Birth Chart Calculator',
          applicationCategory: 'LifestyleApplication',
          operatingSystem: 'Web',
          url: 'https://viastellis.com/free-birth-chart',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          publisher: { '@id': 'https://viastellis.com/#org' },
        }}
      />
      <Starfield count={90} />

      <div className="relative max-w-lg mx-auto px-5 py-10">
        <Link to="/" aria-label="ViaStellis home" className="inline-block mb-6">
          <img src="/logo.svg" alt="ViaStellis" className="w-12 h-12" />
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl text-stardust-200 leading-tight">
          Your free birth chart
        </h1>
        <p className="text-slate-300 text-sm mt-2 mb-8 leading-relaxed">
          See your chart in <strong>both Vedic and Western</strong> astrology — your Sun, Moon and
          Rising signs, plus your Vedic Moon nakshatra. Instant, free, no account needed.
        </p>

        {!result && (
          <form onSubmit={handleSubmit} className="space-y-4 bg-cosmos-900/60 border border-cosmos-700 rounded-2xl p-5">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name (optional)</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                className="w-full bg-cosmos-800 border border-cosmos-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-stardust-400 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Birth date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-cosmos-800 border border-cosmos-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:border-stardust-400 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Birth time</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} disabled={timeUnknown}
                  className="w-full bg-cosmos-800 border border-cosmos-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:border-stardust-400 outline-none disabled:opacity-40" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={timeUnknown} onChange={e => setTimeUnknown(e.target.checked)} className="accent-stardust-400" />
              I don't know my birth time (we'll skip your Rising sign & houses)
            </label>
            <div className="relative">
              <label className="block text-xs text-slate-400 mb-1">Birth city</label>
              <input value={cityQuery} onChange={e => handleCityChange(e.target.value)} placeholder="Start typing a city…"
                className="w-full bg-cosmos-800 border border-cosmos-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-stardust-400 outline-none" />
              {cityResults.length > 0 && !city && (
                <ul className="absolute z-10 mt-1 w-full bg-cosmos-800 border border-cosmos-700 rounded-lg max-h-48 overflow-auto shadow-xl">
                  {cityResults.map((c, i) => (
                    <li key={i}>
                      <button type="button"
                        onClick={() => { setCity(c); setCityQuery(c.display_name); setCityResults([]) }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-cosmos-700">
                        {c.display_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {city && <p className="text-emerald-400 text-xs mt-1.5">✓ {city.display_name}</p>}
            </div>

            {error && <p className="text-rose-300 text-xs">{error}</p>}

            <button type="submit" disabled={working || !date || !city}
              className="w-full rounded-full bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-semibold py-3 disabled:opacity-50 transition-opacity">
              {working ? 'Reading the sky…' : '✨ Reveal my chart'}
            </button>
          </form>
        )}

        {result && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <ChartCard title="🌙 Vedic (sidereal)" rows={[
                ['Sun', result.vedic.sun], ['Moon', result.vedic.moon], ['Rising', result.vedic.rising],
              ]} />
              <ChartCard title="☀️ Western (tropical)" rows={[
                ['Sun', result.western.sun], ['Moon', result.western.moon], ['Rising', result.western.rising],
              ]} />
            </div>

            {result.vedic.moonNakshatra && (
              <div className="bg-cosmos-900/60 border border-stardust-400/30 rounded-2xl px-5 py-4 text-center">
                <p className="text-[11px] uppercase tracking-widest text-stardust-400 mb-1">Your Moon nakshatra</p>
                <p className="text-slate-100 text-lg font-display">{result.vedic.moonNakshatra}</p>
                <p className="text-slate-500 text-xs mt-1">
                  The lunar mansion of your Moon — your deepest emotional signature in Vedic astrology.
                </p>
              </div>
            )}

            <p className="text-slate-400 text-xs leading-relaxed bg-cosmos-900/60 border border-cosmos-800 rounded-xl px-4 py-3">
              Notice your Vedic and Western signs differ? That's because they use different zodiacs — the
              sidereal (star-aligned) vs the tropical (season-aligned).{' '}
              <Link to="/zodiac-systems" className="text-stardust-300 underline">Here's why →</Link>
            </p>

            {/* Conversion CTA */}
            <div className="bg-gradient-to-br from-cosmos-800/90 to-cosmos-900/90 border border-stardust-400/30 rounded-2xl px-5 py-5 text-center">
              <p className="text-slate-100 font-display text-lg mb-1">This is just the beginning</p>
              <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                Create your free account for your full chart — every planet, house, nakshatra and dasha —
                plus a daily horoscope tuned to you, tarot, compatibility, and Stella, your AI astrologer.
              </p>
              <Link to="/auth"
                className="inline-block rounded-full bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-semibold px-6 py-2.5">
                Create my free account →
              </Link>
              <button onClick={() => setResult(null)} className="block mx-auto mt-3 text-slate-500 hover:text-slate-300 text-xs underline">
                Try another birth date
              </button>
            </div>
          </div>
        )}

        <p className="mt-8 text-[11px] text-slate-600 text-center">{ENTERTAINMENT_DISCLAIMER}</p>
      </div>
    </div>
  )
}

function ChartCard({ title, rows }: { title: string; rows: Array<[string, string | undefined]> }) {
  return (
    <div className="bg-cosmos-900/60 border border-cosmos-700 rounded-2xl px-4 py-4">
      <p className="text-xs text-stardust-300 font-medium mb-3">{title}</p>
      <div className="space-y-2">
        {rows.map(([label, sign]) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-slate-500 text-xs">{label}</span>
            <span className="text-slate-100 text-sm">
              {sign ? `${SIGN_GLYPH[sign] ?? ''} ${sign}` : <span className="text-slate-600">—</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
