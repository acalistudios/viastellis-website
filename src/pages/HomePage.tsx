import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useNatalChart } from '@/hooks/useNatalChart'
import { TodayCard } from '@/components/home/TodayCard'
import { InfoBubble } from '@/components/ui/InfoBubble'
import { MoonPhase } from '@/components/ui/MoonPhase'
import { getPanchanga } from '@/lib/panchanga'
import { getPlacementMeaning, getNakshatraMeaning, getChartSynthesis } from '@/lib/placementMeanings'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'
import type { ZodiacSign } from '@/types'

const SIGN_GLYPHS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
}

export function HomePage() {
  const { chart, loading } = useNatalChart()

  const moon = chart?.planets.find(p => p.planet === 'Moon')
  const sun = chart?.planets.find(p => p.planet === 'Sun')

  // Tonight's moon phase (global — same everywhere on Earth).
  const moonPhase = useMemo(() => getPanchanga(new Date()).moonPhase, [])

  return (
    <div className="relative flex flex-col items-center px-6 py-10 text-center max-w-lg mx-auto">
      <Link
        to="/settings"
        aria-label="Settings"
        className="absolute top-4 right-4 text-slate-600 hover:text-slate-300 transition-colors text-xl"
      >
        ⚙
      </Link>
      <img src="/logo.svg" alt="" className="w-14 h-14 mb-2" />
      <h1 className="text-4xl font-display text-stardust-300 mb-1">ViaStellis</h1>
      <p className="text-slate-500 text-sm mb-8">Your path through the stars</p>

      {loading ? (
        <span className="w-8 h-8 rounded-full border-2 border-stardust-400 border-t-transparent animate-spin my-12" />
      ) : chart ? (
        <>
          <p className="text-slate-300 text-lg mb-4">
            Welcome back, <span className="text-stardust-300">{chart.birth_data.name}</span>
          </p>

          {/* Tonight's moon */}
          <div className="flex flex-col items-center mb-6">
            <MoonPhase illumination={moonPhase.illumination} name={moonPhase.name} size={64} />
            <p className="text-slate-400 text-xs mt-1.5">
              {moonPhase.name} · <span className="text-slate-500">{moonPhase.illumination}% lit</span>
            </p>
          </div>

          {/* Daily horoscope */}
          <TodayCard chart={chart} />

          {/* Combined blueprint — what your three pillars mean together */}
          {sun && moon && (
            <BlueprintCard
              sunSign={sun.sign}
              moonSign={moon.sign}
              lagnaSign={chart.birth_data.time_unknown ? undefined : chart.ascendant.sign}
            />
          )}

          {/* Key placements */}
          <div className="grid grid-cols-1 gap-3 w-full mb-8">
            {moon && (
              <PlacementCard
                role="moon"
                label="Moon Sign (Rashi)"
                sign={moon.sign}
                nakshatra={moon.nakshatra}
                pada={moon.nakshatra_pada}
              />
            )}
            {sun && (
              <PlacementCard
                role="sun"
                label="Sun Sign"
                sign={sun.sign}
                nakshatra={sun.nakshatra}
                pada={sun.nakshatra_pada}
              />
            )}
            {!chart.birth_data.time_unknown && (
              <PlacementCard
                role="lagna"
                label="Lagna (Rising)"
                sign={chart.ascendant.sign}
              />
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-3 w-full">
            <Link
              to="/chart"
              className="bg-cosmos-800 hover:bg-cosmos-700 border border-cosmos-600 rounded-2xl px-4 py-5 transition-colors"
            >
              <p className="text-2xl mb-1">✦</p>
              <p className="text-slate-200 text-sm font-medium">Full Chart</p>
            </Link>
            <Link
              to="/journal"
              className="bg-cosmos-800 hover:bg-cosmos-700 border border-cosmos-600 rounded-2xl px-4 py-5 transition-colors"
            >
              <p className="text-2xl mb-1">📓</p>
              <p className="text-slate-200 text-sm font-medium">Journal</p>
            </Link>
            <Link
              to="/stella"
              className="bg-stardust-400/10 hover:bg-stardust-400/20 border border-stardust-400/40 rounded-2xl px-4 py-5 transition-colors"
            >
              <p className="text-2xl mb-1">💬</p>
              <p className="text-stardust-300 text-sm font-medium">Ask Stella</p>
            </Link>
          </div>
        </>
      ) : (
        <p className="text-slate-500 text-sm">Set up your birth chart to get started</p>
      )}

      <p className="mt-12 text-[11px] text-slate-600 max-w-xs">{ENTERTAINMENT_DISCLAIMER}</p>
    </div>
  )
}

interface BlueprintCardProps {
  sunSign: ZodiacSign
  moonSign: ZodiacSign
  lagnaSign?: ZodiacSign
}

function BlueprintCard({ sunSign, moonSign, lagnaSign }: BlueprintCardProps) {
  const synth = getChartSynthesis(sunSign, moonSign, lagnaSign)

  return (
    <div className="w-full bg-gradient-to-br from-cosmos-800/80 to-cosmos-900/80 border border-stardust-400/30 rounded-2xl px-5 py-4 mb-3 text-left">
      <p className="text-[11px] uppercase tracking-widest text-stardust-400 mb-1">Your Blueprint</p>
      <p className="text-slate-100 font-display text-lg leading-snug mb-3">
        {synth.headline}
        {synth.isDouble && (
          <span className="ml-2 align-middle text-[10px] uppercase tracking-wider text-stellar-300 border border-stellar-300/40 rounded-full px-2 py-0.5">
            double {sunSign}
          </span>
        )}
      </p>

      <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Personality</p>
      <p className="text-slate-300 text-sm leading-relaxed mb-3">{synth.personality}</p>

      <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Career & vocation</p>
      <p className="text-slate-300 text-sm leading-relaxed">{synth.career}</p>

      <p className="text-[10px] text-slate-600 mt-3 italic">
        A blended reading of your rising, Sun, and Moon signs. Inclinations, not rules — your full
        chart (houses, dashas, yogas) refines all of this.
      </p>
    </div>
  )
}

interface PlacementCardProps {
  role: 'moon' | 'sun' | 'lagna'
  label: string
  sign: ZodiacSign
  nakshatra?: string
  pada?: number
}

function PlacementCard({ role, label, sign, nakshatra, pada }: PlacementCardProps) {
  const meaning = getPlacementMeaning(role, sign)
  const nak = nakshatra ? getNakshatraMeaning(nakshatra) : undefined

  return (
    <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl px-5 py-4 text-left">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-slate-500 flex items-center gap-1">
            {label}
            <InfoBubble title={`${sign} ${label.split(' ')[0]}`} align="left">
              {meaning.detail}
            </InfoBubble>
          </p>
          <p className="text-slate-100 text-lg font-display">{SIGN_GLYPHS[sign]} {sign}</p>
        </div>
        {nakshatra && (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest text-slate-500 flex items-center justify-end gap-1">
              Nakshatra
              {nak && (
                <InfoBubble title={`${nakshatra}${nak.symbol ? ` · ${nak.symbol}` : ''}`} align="right">
                  {nak.meaning} {nak.deity && <span className="text-slate-500">(Deity: {nak.deity}.)</span>}
                </InfoBubble>
              )}
            </p>
            <p className="text-stardust-300 text-sm">{nakshatra}{pada ? ` · pada ${pada}` : ''}</p>
          </div>
        )}
      </div>

      {/* Plain-language interpretation */}
      <p className="text-slate-400 text-xs mt-2 leading-relaxed border-t border-cosmos-800 pt-2">
        {meaning.detail}
      </p>
    </div>
  )
}
