import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { PublicMarketingNav } from '@/components/layout/PublicMarketingNav'
import { Starfield } from '@/components/ui/Starfield'
import { NorthIndianChart } from '@/components/chart/NorthIndianChart'
import { WesternWheel } from '@/components/chart/WesternWheel'
import { CREDIT_COSTS, creditLabel } from '@/config/creditCosts'
import { createClientReportDraft } from '@/lib/clientReports'
import { calculateNatalChart } from '@/lib/ephemeris'
import { calculateWesternChart } from '@/lib/westernChart'
import { getTimezone, searchCities, type CityResult } from '@/lib/geocoding'
import { useUser } from '@/store/UserContext'
import type { BirthData } from '@/types'

interface Draft {
  name: string
  date: string
  time: string
  timeUnknown: boolean
  city: string
  country: string
  latitude: number | null
  longitude: number | null
  timezone: string
}

const EMPTY_DRAFT: Draft = {
  name: '',
  date: '',
  time: '',
  timeUnknown: false,
  city: '',
  country: '',
  latitude: null,
  longitude: null,
  timezone: '',
}

export function PractitionerChartPage() {
  const { user, profile } = useUser()
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<CityResult[]>([])
  const [cityError, setCityError] = useState('')
  const [searching, setSearching] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const isPremium = profile?.subscription_tier === 'premium'
  const clientChartCost = isPremium ? CREDIT_COSTS.client_birth_chart_premium : CREDIT_COSTS.client_birth_chart

  const birthData = useMemo<BirthData | null>(() => {
    if (!draft.name.trim() || !draft.date || draft.latitude == null || draft.longitude == null || !draft.timezone) {
      return null
    }
    if (!draft.timeUnknown && !draft.time) return null

    return {
      name: draft.name.trim(),
      date: draft.date,
      time: draft.timeUnknown ? '12:00' : draft.time,
      time_unknown: draft.timeUnknown,
      city: draft.city,
      country: draft.country,
      latitude: draft.latitude,
      longitude: draft.longitude,
      timezone: draft.timezone,
    }
  }, [draft])

  const charts = useMemo(() => {
    if (!birthData) return null
    return {
      vedic: calculateNatalChart(birthData),
      western: calculateWesternChart(birthData),
    }
  }, [birthData])

  async function handleCitySearch(query: string) {
    setCityQuery(query)
    setDraft(prev => ({ ...prev, city: '', country: '', latitude: null, longitude: null, timezone: '' }))
    setCityError('')
    if (query.trim().length < 2) {
      setCityResults([])
      return
    }
    setSearching(true)
    try {
      setCityResults(await searchCities(query))
    } catch (err: unknown) {
      setCityError(err instanceof Error ? err.message : 'City search failed.')
    } finally {
      setSearching(false)
    }
  }

  function selectCity(city: CityResult) {
    const timezone = getTimezone(city.latitude, city.longitude)
    setDraft(prev => ({
      ...prev,
      city: city.city,
      country: city.country,
      latitude: city.latitude,
      longitude: city.longitude,
      timezone,
    }))
    setCityQuery(city.display_name)
    setCityResults([])
  }

  async function handleSaveClientDraft() {
    if (!user || !birthData) return
    try {
      await createClientReportDraft(user.id, birthData)
      setSaveMessage('Saved to Client Reports.')
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Could not save this client draft.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0817] via-[#1a1a3f] to-[#0a0e27] text-slate-100 relative overflow-hidden">
      <Seo
        title="Create Practitioner Chart - ViaStellis"
        description="Create a practitioner birth chart preview with Vedic and Western chart data, powered by ViaStellis."
        path="/practitioners/create"
        noindex
      />
      <Starfield count={90} />
      <PublicMarketingNav />

      <main className="relative z-10 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <Link to="/practitioners" className="text-sm text-slate-400 hover:text-stardust-300">
            Back to ViaStellis for Astrologers
          </Link>

          <div className="grid lg:grid-cols-[420px_1fr] gap-8 mt-6 items-start">
            <section className="rounded-3xl border border-stardust-400/20 bg-gradient-to-br from-[#1a1a3f]/80 to-[#0f0817]/80 p-6">
              <p className="text-stellar-300 uppercase tracking-[0.22em] text-xs font-semibold mb-3">
                Practitioner chart workspace
              </p>
              <h1 className="font-display text-4xl text-stardust-300 mb-3">
                Create a client chart
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Enter client birth details to preview the deterministic chart data. Client-ready packets will cost {creditLabel(clientChartCost)} when final PDF and AI prep generation are wired.
              </p>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm text-slate-300 font-medium">Client name</span>
                  <input
                    value={draft.name}
                    onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-2 w-full rounded-xl bg-cosmos-900 border border-cosmos-700 px-4 py-3 text-slate-100 focus:outline-none focus:border-stardust-400"
                    placeholder="Client name"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-slate-300 font-medium">Birth date</span>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={e => setDraft(prev => ({ ...prev, date: e.target.value }))}
                    className="mt-2 w-full rounded-xl bg-cosmos-900 border border-cosmos-700 px-4 py-3 text-slate-100 focus:outline-none focus:border-stardust-400 [color-scheme:dark]"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-slate-300 font-medium">Birth time</span>
                  <input
                    type="time"
                    value={draft.time}
                    disabled={draft.timeUnknown}
                    onChange={e => setDraft(prev => ({ ...prev, time: e.target.value }))}
                    className="mt-2 w-full rounded-xl bg-cosmos-900 border border-cosmos-700 px-4 py-3 text-slate-100 focus:outline-none focus:border-stardust-400 disabled:opacity-50 [color-scheme:dark]"
                  />
                </label>

                <label className="flex items-center gap-3 text-sm text-slate-400">
                  <input
                    type="checkbox"
                    checked={draft.timeUnknown}
                    onChange={e => setDraft(prev => ({ ...prev, timeUnknown: e.target.checked, time: e.target.checked ? '' : prev.time }))}
                    className="w-4 h-4 accent-stardust-400"
                  />
                  Birth time unknown
                </label>

                <label className="block relative">
                  <span className="text-sm text-slate-300 font-medium">Birth city</span>
                  <input
                    value={cityQuery}
                    onChange={e => void handleCitySearch(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-cosmos-900 border border-cosmos-700 px-4 py-3 text-slate-100 focus:outline-none focus:border-stardust-400"
                    placeholder="Type a city..."
                  />
                  {cityResults.length > 0 && (
                    <ul className="absolute z-30 mt-2 w-full rounded-xl border border-cosmos-700 bg-cosmos-900 shadow-2xl overflow-hidden">
                      {cityResults.slice(0, 6).map((city, index) => (
                        <li key={`${city.display_name}-${index}`}>
                          <button
                            type="button"
                            onClick={() => selectCity(city)}
                            className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-cosmos-800 border-b border-cosmos-800 last:border-0"
                          >
                            {city.display_name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {searching && <p className="text-xs text-slate-500 mt-2">Searching...</p>}
                  {cityError && <p className="text-xs text-rose-300 mt-2">{cityError}</p>}
                  {draft.city && (
                    <p className="text-xs text-emerald-300 mt-2">
                      Selected: {draft.city}, {draft.country} | {draft.timezone}
                    </p>
                  )}
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-stardust-400/20 bg-gradient-to-br from-[#1a1a3f]/70 to-[#0f0817]/70 p-6">
              {!charts || !birthData ? (
                <div className="min-h-[520px] grid place-items-center text-center">
                  <div>
                    <p className="font-display text-3xl text-stardust-300 mb-3">Chart preview</p>
                    <p className="text-slate-500 max-w-md">
                      Complete the client details to generate Vedic and Western chart previews.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-white text-[#1f172a] rounded-2xl p-5 mb-5">
                    <div className="flex items-center justify-between border-b border-[#ddd4ea] pb-4 mb-5">
                      <div className="flex items-center gap-3">
                        <img src="/logo.svg" alt="" className="w-10 h-10" />
                        <div>
                          <p className="font-display text-2xl text-[#241639]">ViaStellis</p>
                          <p className="text-xs text-[#8a7b9c]">Powered by ViaStellis</p>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-[#6b5c81]">viastellis.com</p>
                    </div>
                    <h2 className="text-2xl font-semibold">{birthData.name}'s Birth Chart</h2>
                    <p className="text-sm text-[#6b5c81] mt-1">
                      {birthData.date} | {birthData.time_unknown ? 'Time unknown' : birthData.time} | {birthData.city}, {birthData.country}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="rounded-2xl border border-stardust-400/20 bg-cosmos-900 p-4">
                      <h3 className="font-display text-2xl text-stardust-300 mb-3">Vedic chart</h3>
                      <NorthIndianChart chart={charts.vedic} className="w-full h-auto" />
                    </div>
                    <div className="rounded-2xl border border-stardust-400/20 bg-cosmos-900 p-4">
                      <h3 className="font-display text-2xl text-stardust-300 mb-3">Western chart</h3>
                      {birthData.time_unknown ? (
                        <div className="aspect-square rounded-2xl border border-cosmos-700 grid place-items-center px-6 text-center text-sm text-slate-500">
                          Western wheel requires birth time for Ascendant and houses. Planetary signs can still be calculated.
                        </div>
                      ) : (
                        <WesternWheel chart={charts.western} className="w-full h-auto" />
                      )}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-stardust-400/20 bg-cosmos-900/80 p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <p className="text-stardust-300 font-semibold mb-2">Client report draft</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                          This preview is the free deterministic layer. Final client-ready packets should debit {creditLabel(clientChartCost)} and unlock polished PDF export, AI prep notes, and saved client packet generation.
                        </p>
                        {saveMessage && <p className="text-sm text-emerald-300 mt-3">{saveMessage}</p>}
                      </div>
                      {user ? (
                        <button
                          type="button"
                          onClick={() => void handleSaveClientDraft()}
                          className="shrink-0 px-5 py-3 rounded-full bg-gradient-to-r from-stardust-400 to-stellar-300 text-[#0a0e27] font-semibold hover:shadow-lg hover:shadow-stardust-400/30"
                        >
                          Save client draft
                        </button>
                      ) : (
                        <Link
                          to="/auth"
                          className="shrink-0 px-5 py-3 rounded-full border border-stardust-400/40 text-slate-100 hover:border-stardust-400/70 text-center"
                        >
                          Sign in to save
                        </Link>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-4">
                      Standard cost is {creditLabel(CREDIT_COSTS.client_birth_chart)}. Premium astrologers receive a 10% discount: {creditLabel(CREDIT_COSTS.client_birth_chart_premium)}.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
