/**
 * Multi-step birth data onboarding form.
 * Steps: Name → Date → Time → Location → Confirm
 * Geocoding: Nominatim (OSM) · Timezone: TimeAPI.io
 * Saves primary birth_chart to Supabase, then navigates to /
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/store/UserContext'
import { searchCities, getTimezone, type CityResult } from '@/lib/geocoding'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  name: string
  birth_date: string          // "YYYY-MM-DD"
  birth_time: string          // "HH:MM" or ""
  time_unknown: boolean
  city: string
  country: string
  latitude: number | null
  longitude: number | null
  timezone: string
}

const TOTAL_STEPS = 5

// The single astrology-system choice that drives the whole app: the birth chart
// AND the default daily-horoscope lens. `help` powers the (?) tooltips. Users can
// change this later in Settings. ViaStellis recommends Vedic.
const SYSTEM_OPTIONS = [
  {
    value: 'vedic',
    label: '🪔 Vedic (sidereal)',
    help: 'The traditional Indian system: a star-aligned (sidereal) zodiac with nakshatras and dashas. Daily readings use your Moon sign (rashi). Recommended.',
  },
  {
    value: 'western',
    label: '♈ Western (tropical)',
    help: 'The familiar Western system: the tropical zodiac from newspapers and most apps, with Placidus houses and aspects. Daily readings use your Sun sign.',
  },
] as const

type SystemValue = (typeof SYSTEM_OPTIONS)[number]['value']

// One source of truth: the chosen system determines the default daily lens.
// Vedic → Moon sign (rashi, the traditional Vedic daily reading); Western → Sun sign.
function defaultLensFor(system: SystemValue): 'vedic_moon' | 'western_sun' {
  return system === 'western' ? 'western_sun' : 'vedic_moon'
}

const emptyForm: FormData = {
  name: '',
  birth_date: '',
  birth_time: '',
  time_unknown: false,
  city: '',
  country: '',
  latitude: null,
  longitude: null,
  timezone: '',
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-10">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <span
          key={i}
          className={[
            'rounded-full transition-all duration-300',
            i + 1 === step
              ? 'w-6 h-2 bg-stardust-400'
              : i + 1 < step
              ? 'w-2 h-2 bg-stardust-400/50'
              : 'w-2 h-2 bg-cosmos-600',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

// ─── Shared: expandable "why do we need this" detail ──────────────────────────

function WhyThis({ children }: { children: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-stardust-400 hover:text-stardust-300 underline underline-offset-2"
      >
        {open ? 'Hide details' : 'Why do we need this?'}
      </button>
      {open && <p className="text-xs text-slate-500 mt-2 leading-relaxed">{children}</p>}
    </div>
  )
}

// ─── Step 1: Name ─────────────────────────────────────────────────────────────

function StepName({
  value,
  onChange,
  onNext,
}: {
  value: string
  onChange: (v: string) => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-3xl text-stardust-300 mb-2">What should Stella call you?</h2>
        <p className="text-slate-500 text-sm">This is how Stella will address you in readings.</p>
      </div>
      <Input
        placeholder="Your name or nickname"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && value.trim() && onNext()}
      />
      <Button size="lg" onClick={onNext} disabled={!value.trim()}>
        Continue →
      </Button>
    </div>
  )
}

// ─── Step 2: Birth Date ───────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate() // day 0 of next month = last day of this month
}

/**
 * Typeable month/day/year birth date entry. A native <input type="date"> forces
 * many mobile browsers into a scrolling wheel picker that's painfully slow to
 * reach a year decades back — typing "1978" directly is much faster.
 */
function BirthDateFields({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [y, m, d] = value ? value.split('-').map(Number) : [undefined, undefined, undefined]
  const [month, setMonth] = useState<number | ''>(m || '')
  const [day, setDay] = useState<number | ''>(d || '')
  const [year, setYear] = useState<number | ''>(y || '')
  const currentYear = new Date().getFullYear()

  function emit(nextMonth: number | '', nextDay: number | '', nextYear: number | '') {
    if (nextMonth === '' || nextDay === '' || nextYear === '' || String(nextYear).length < 4) {
      onChange('')
      return
    }
    const maxDay = daysInMonth(nextMonth, nextYear)
    const clampedDay = Math.min(nextDay, maxDay)
    if (clampedDay !== nextDay) setDay(clampedDay)
    const iso = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
    // Can't be born in the future.
    onChange(iso > new Date().toISOString().split('T')[0] ? '' : iso)
  }

  return (
    <div className="grid grid-cols-[1fr_90px_110px] gap-2">
      <select
        value={month}
        onChange={(e) => { const v = e.target.value ? Number(e.target.value) : ''; setMonth(v); emit(v, day, year) }}
        className="w-full bg-cosmos-800 border border-cosmos-600 rounded-xl px-3 py-3 text-slate-100 focus:outline-none focus:border-stardust-400 focus:ring-1 focus:ring-stardust-400"
      >
        <option value="">Month</option>
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={i + 1}>{name}</option>
        ))}
      </select>
      <input
        type="number"
        inputMode="numeric"
        placeholder="Day"
        min={1}
        max={31}
        value={day}
        onChange={(e) => {
          const v = e.target.value ? Math.max(1, Math.min(31, Number(e.target.value))) : ''
          setDay(v); emit(month, v, year)
        }}
        className="w-full bg-cosmos-800 border border-cosmos-600 rounded-xl px-3 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-stardust-400 focus:ring-1 focus:ring-stardust-400"
      />
      <input
        type="number"
        inputMode="numeric"
        placeholder="Year"
        min={1900}
        max={currentYear}
        value={year}
        onChange={(e) => {
          const raw = e.target.value
          const v = raw ? Number(raw) : ''
          setYear(v); emit(month, day, v)
        }}
        className="w-full bg-cosmos-800 border border-cosmos-600 rounded-xl px-3 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-stardust-400 focus:ring-1 focus:ring-stardust-400"
      />
    </div>
  )
}

function StepDate({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: string
  onChange: (v: string) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-3xl text-stardust-300 mb-2">When were you born?</h2>
        <p className="text-slate-500 text-sm">Your birth date anchors your natal chart.</p>
      </div>
      <BirthDateFields value={value} onChange={onChange} />
      <p className="text-slate-600 text-xs -mt-3">
        Made a mistake? You can always update this later in Settings.
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">← Back</Button>
        <Button onClick={onNext} disabled={!value} className="flex-1">Continue →</Button>
      </div>
    </div>
  )
}

// ─── Step 3: Birth Time ───────────────────────────────────────────────────────

function StepTime({
  time,
  unknown,
  onTimeChange,
  onUnknownChange,
  onNext,
  onBack,
}: {
  time: string
  unknown: boolean
  onTimeChange: (v: string) => void
  onUnknownChange: (v: boolean) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-3xl text-stardust-300 mb-2">What time were you born?</h2>
        <p className="text-slate-500 text-sm mb-2">
          Even an approximate time helps. Don't know it? No problem — skip it below.
        </p>
        <WhyThis>
          Birth time determines your Rising sign and house placements — the parts of your chart
          tied to timing within the day. Without it, we can still calculate your Sun and Moon
          signs and everything else; you'll just be missing the Rising sign and houses until you
          add a time later.
        </WhyThis>
      </div>

      <Input
        type="time"
        value={time}
        onChange={(e) => onTimeChange(e.target.value)}
        disabled={unknown}
        className="[color-scheme:dark]"
      />

      <label className="flex items-center gap-3 cursor-pointer group">
        <span
          onClick={() => onUnknownChange(!unknown)}
          className={[
            'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
            unknown
              ? 'bg-stardust-400 border-stardust-400'
              : 'border-cosmos-600 group-hover:border-stardust-400',
          ].join(' ')}
        >
          {unknown && (
            <svg className="w-3 h-3 text-cosmos-950" viewBox="0 0 12 12" fill="currentColor">
              <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          )}
        </span>
        <span
          onClick={() => onUnknownChange(!unknown)}
          className="text-sm text-slate-400 select-none"
        >
          I don't know my birth time
        </span>
      </label>

      {unknown && (
        <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-3">
          Without a birth time, your Rising sign and houses won't be calculated. Rising sign accuracy requires time within 2 hours.
          Don't worry — you can add it anytime later in Settings → Edit Birth Details.
        </p>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">← Back</Button>
        <Button
          onClick={onNext}
          disabled={!unknown && !time}
          className="flex-1"
        >
          Continue →
        </Button>
      </div>
    </div>
  )
}

// ─── Step 4: Location ─────────────────────────────────────────────────────────

function StepLocation({
  formData,
  onSelect,
  onNext,
  onBack,
}: {
  formData: FormData
  onSelect: (result: CityResult, timezone: string) => void
  onNext: () => void
  onBack: () => void
}) {
  const [query, setQuery] = useState(formData.city || '')
  const [results, setResults] = useState<CityResult[]>([])
  const [searching, setSearching] = useState(false)
  const [fetchingTz, setFetchingTz] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selected = formData.latitude !== null

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setSearching(true)
    setError('')
    try {
      const r = await searchCities(q)
      setResults(r)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }, [])

  function handleQueryChange(value: string) {
    setQuery(value)
    // Clear previous selection if user re-types
    if (selected) onSelect({ display_name: '', city: '', country: '', latitude: 0, longitude: 0 }, '')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 400)
  }

  async function handlePick(result: CityResult) {
    setQuery(result.display_name)
    setResults([])
    setFetchingTz(true)
    try {
      const tz = getTimezone(result.latitude, result.longitude)
      onSelect(result, tz)
    } finally {
      setFetchingTz(false)
    }
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-3xl text-stardust-300 mb-2">Where were you born?</h2>
        <p className="text-slate-500 text-sm mb-2">
          This helps Stella calculate your exact chart.
        </p>
        <WhyThis>
          Your birth location (and its time zone) determines your local sidereal time — the
          precise angle of the sky at your moment of birth — which sets your Rising sign and
          house cusps.
        </WhyThis>
      </div>

      <div className="relative">
        <Input
          placeholder="Type a city name…"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          error={error}
          autoComplete="off"
        />

        {/* Dropdown */}
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full bg-cosmos-800 border border-cosmos-600 rounded-xl overflow-hidden shadow-2xl">
            {results.map((r, i) => (
              <li
                key={i}
                onClick={() => handlePick(r)}
                className="px-4 py-3 text-sm text-slate-300 hover:bg-cosmos-700 cursor-pointer transition-colors border-b border-cosmos-700 last:border-0"
              >
                {r.display_name}
              </li>
            ))}
          </ul>
        )}

        {searching && (
          <p className="text-xs text-slate-500 mt-2">Searching…</p>
        )}
        {fetchingTz && (
          <p className="text-xs text-slate-500 mt-2">Detecting timezone…</p>
        )}
        {selected && formData.timezone && (
          <p className="text-xs text-emerald-400 mt-2">
            ✓ {formData.city}, {formData.country} · {formData.timezone}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">← Back</Button>
        <Button
          onClick={onNext}
          disabled={!selected || fetchingTz}
          className="flex-1"
        >
          Continue →
        </Button>
      </div>
    </div>
  )
}

// ─── Step 5: Confirm ──────────────────────────────────────────────────────────

function StepConfirm({
  formData,
  system,
  onSystemChange,
  showSystem,
  onBack,
  onSubmit,
  saving,
}: {
  formData: FormData
  system: SystemValue
  onSystemChange: (v: SystemValue) => void
  showSystem: boolean
  onBack: () => void
  onSubmit: () => void
  saving: boolean
}) {
  const rows: { label: string; value: string }[] = [
    { label: 'Name', value: formData.name },
    { label: 'Date', value: formData.birth_date },
    { label: 'Time', value: formData.time_unknown ? 'Unknown' : (formData.birth_time || '—') },
    { label: 'City', value: `${formData.city}, ${formData.country}` },
    { label: 'Timezone', value: formData.timezone },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-3xl text-stardust-300 mb-2">Does this look right?</h2>
        <p className="text-slate-500 text-sm">
          Stella will use this to calculate your natal chart. Nothing here is permanent — you can
          edit any of it later from Settings → Edit Birth Details.
        </p>
      </div>

      <div className="bg-cosmos-800 border border-cosmos-600 rounded-2xl overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-5 py-3.5 border-b border-cosmos-700 last:border-0"
          >
            <span className="text-slate-500 text-sm">{row.label}</span>
            <span className="text-slate-200 text-sm font-medium text-right max-w-[60%]">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Astrology system — drives both the chart and the daily horoscope.
          Changeable later in Settings. */}
      {showSystem && (
      <div>
        <p className="text-slate-300 text-sm font-medium mb-1">Your astrology system</p>
        <p className="text-slate-500 text-xs mb-3">
          This sets your birth chart and your daily horoscope. You can change it anytime in Settings.
        </p>
        <div className="flex flex-col gap-2">
          {SYSTEM_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={[
                'flex items-center gap-3 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors text-sm',
                system === opt.value
                  ? 'border-stardust-400/50 bg-stardust-400/10 text-stardust-200'
                  : 'border-cosmos-700 text-slate-300 hover:border-cosmos-600',
              ].join(' ')}
            >
              <input
                type="radio"
                name="onboardingSystem"
                value={opt.value}
                checked={system === opt.value}
                onChange={() => onSystemChange(opt.value)}
                className="accent-stardust-400"
              />
              <span className="flex-1">{opt.label}</span>
              <span
                role="img"
                aria-label={opt.help}
                title={opt.help}
                className="flex-shrink-0 w-4 h-4 rounded-full border border-slate-500 text-slate-400 text-[10px] leading-[14px] text-center cursor-help"
              >
                ?
              </span>
            </label>
          ))}
        </div>
      </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1" disabled={saving}>
          ← Back
        </Button>
        <Button onClick={onSubmit} className="flex-1" isLoading={saving}>
          ✨ Start My Reading
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface BirthDataFormProps {
  /** 'create' inserts a new primary chart (onboarding); 'edit' prefills and updates the existing one. */
  mode?: 'create' | 'edit'
}

export function BirthDataForm({ mode = 'create' }: BirthDataFormProps) {
  const navigate = useNavigate()
  const { user, refreshChartStatus } = useUser()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [system, setSystem] = useState<SystemValue>('vedic')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [rowId, setRowId] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(mode === 'edit')

  // In edit mode, prefill from the existing primary chart
  useEffect(() => {
    if (mode !== 'edit' || !user) return
    let cancelled = false

    supabase
      .from('birth_charts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setSaveError('Could not load your current details.')
        } else {
          setRowId(data.id)
          setFormData({
            name: data.name,
            birth_date: data.birth_date,
            birth_time: data.birth_time ? data.birth_time.slice(0, 5) : '',
            time_unknown: data.time_unknown,
            city: data.city,
            country: data.country,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            timezone: data.timezone,
          })
        }
        setInitializing(false)
      })

    return () => { cancelled = true }
  }, [mode, user])

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function handleLocationSelect(result: CityResult, timezone: string) {
    setFormData((prev) => ({
      ...prev,
      city: result.city,
      country: result.country,
      latitude: result.latitude || null,
      longitude: result.longitude || null,
      timezone,
    }))
  }

  async function handleSubmit() {
    if (!user) return
    setSaving(true)
    setSaveError('')

    try {
      const values = {
        name: formData.name.trim(),
        birth_date: formData.birth_date,
        birth_time: formData.time_unknown ? null : (formData.birth_time || null),
        time_unknown: formData.time_unknown,
        city: formData.city,
        country: formData.country,
        latitude: formData.latitude!,
        longitude: formData.longitude!,
        timezone: formData.timezone,
        // Invalidate any cached calculation — birth data changed
        chart_data: null,
        calculated_at: null,
      }

      if (mode === 'edit' && rowId) {
        const { error } = await supabase
          .from('birth_charts')
          .update(values)
          .eq('id', rowId)
        if (error) throw error
        navigate('/settings', { replace: true })
      } else {
        const { error } = await supabase.from('birth_charts').insert({
          user_id: user.id,
          label: 'Me',
          is_primary: true,
          ...values,
        })
        if (error) throw error
        // One source of truth: the chosen system sets both the chart system and
        // the derived default daily-horoscope lens (non-fatal if it fails).
        await supabase
          .from('profiles')
          .update({ chart_system: system, default_horoscope_lens: defaultLensFor(system) })
          .eq('id', user.id)
        // Refresh context so AuthGuard sees hasPrimaryChart=true immediately
        await refreshChartStatus()
        navigate('/', { replace: true })
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-cosmos-950 flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-2 border-stardust-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cosmos-950 flex flex-col items-center justify-center px-6 py-16">
      {/* Header */}
      <div className="mb-2 text-center">
        {mode === 'edit' && (
          <button
            onClick={() => navigate('/settings')}
            className="text-slate-500 hover:text-slate-300 text-sm mb-3 transition-colors"
          >
            ← Cancel
          </button>
        )}
        <p className="text-stardust-400 text-sm font-medium tracking-widest uppercase">
          {mode === 'edit' ? 'Edit Birth Details · ' : ''}Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      <div className="w-full max-w-sm">
        <ProgressDots step={step} />

        {step === 1 && (
          <StepName
            value={formData.name}
            onChange={(v) => update('name', v)}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepDate
            value={formData.birth_date}
            onChange={(v) => update('birth_date', v)}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <StepTime
            time={formData.birth_time}
            unknown={formData.time_unknown}
            onTimeChange={(v) => update('birth_time', v)}
            onUnknownChange={(v) => {
              update('time_unknown', v)
              if (v) update('birth_time', '')
            }}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <StepLocation
            formData={formData}
            onSelect={handleLocationSelect}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        )}

        {step === 5 && (
          <>
            <StepConfirm
              formData={formData}
              system={system}
              onSystemChange={setSystem}
              showSystem={mode === 'create'}
              onBack={() => setStep(4)}
              onSubmit={handleSubmit}
              saving={saving}
            />
            {saveError && (
              <p className="text-rose-400 text-sm mt-4 text-center">{saveError}</p>
            )}
          </>
        )}
      </div>

      {mode !== 'edit' && (
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            navigate('/auth', { replace: true })
          }}
          className="mt-10 text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          Not you? Sign out
        </button>
      )}
    </div>
  )
}
