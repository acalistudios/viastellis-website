import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useNatalChart } from '@/hooks/useNatalChart'
import { useUser } from '@/store/UserContext'
import { calculateWesternChart } from '@/lib/westernChart'
import { TodayCard } from '@/components/home/TodayCard'
import { TarotSection } from '@/components/home/TarotSection'
import { FullMoonCard } from '@/components/home/FullMoonCard'
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
  const [params] = useSearchParams()
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(params.get('checkout') === 'success')

  const moon = chart?.planets.find(p => p.planet === 'Moon')
  const sun = chart?.planets.find(p => p.planet === 'Sun')

  // When the user prefers the Western (tropical) system, the blueprint + placement
  // cards should use tropical Sun/Moon/Rising (and drop nakshatras), not the Vedic chart.
  const { profile } = useUser()
  const isWestern = profile?.chart_system === 'western'
  const westernChart = useMemo(
    () => (isWestern && chart ? calculateWesternChart(chart.birth_data) : null),
    [isWestern, chart],
  )
  const timeKnown = chart ? !chart.birth_data.time_unknown : false
  const wSun = westernChart?.planets.find(p => p.body === 'Sun')?.sign
  const wMoon = westernChart?.planets.find(p => p.body === 'Moon')?.sign
  const bpSun = isWestern ? wSun : sun?.sign
  const bpMoon = isWestern ? wMoon : moon?.sign
  const bpRising = !timeKnown ? undefined : (isWestern ? westernChart?.ascendant.sign : chart?.ascendant.sign)

  // Tonight's moon phase (global — same everywhere on Earth).
  const moonPhase = useMemo(() => getPanchanga(new Date()).moonPhase, [])

  return (
    <div className="relative flex flex-col items-center px-6 py-10 text-center max-w-lg lg:max-w-3xl mx-auto">
      <Link
        to="/settings"
        aria-label="Settings"
        className="absolute top-4 right-4 text-slate-600 hover:text-slate-300 transition-colors text-xl"
      >
        ⚙
      </Link>
      {showCheckoutSuccess && (
        <div className="w-full mb-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-left flex items-start gap-3">
          <span className="text-lg leading-none mt-0.5">✨</span>
          <div className="flex-1">
            <p className="text-emerald-200 text-sm font-medium">Payment successful — thank you!</p>
            <p className="text-emerald-200/70 text-xs mt-0.5">
              Your credits have been added to your account. Enjoy your readings with Stella.
            </p>
          </div>
          <button
            onClick={() => setShowCheckoutSuccess(false)}
            aria-label="Dismiss"
            className="text-emerald-200/60 hover:text-emerald-100 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      <img src="/logo.svg" alt="" className="w-14 h-14 mb-2" />
      <h1 className="text-4xl font-display text-stardust-300 mb-1">ViaStellis</h1>
      <p className="text-slate-500 text-sm mb-8">Wisdom from the stars</p>

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
            <p className="text-slate-400 text-xs mt-1.5 inline-flex items-center gap-1.5">
              <span>{moonPhase.name} · <span className="text-slate-500">{moonPhase.illumination}% lit</span></span>
              <InfoBubble title="Tonight's Moon" align="center">
                This is the Moon's illuminated fraction right <em>now</em>. It changes continuously,
                so it can differ by a few percent from sources that fix it to a set time of day — ours
                is computed for the current moment. As for meaning: a <strong>waxing</strong> (growing)
                Moon favors building, intention-setting, and starting things; the <strong>Full Moon</strong>{' '}
                brings culmination and release; a <strong>waning</strong> (shrinking) Moon is for letting
                go and rest; the <strong>New Moon</strong> is for fresh starts.
              </InfoBubble>
            </p>
          </div>

          {/* Daily horoscope */}
          <TodayCard chart={chart} />

          {/* Daily tarot */}
          <FullMoonCard chart={chart} />
          <TarotSection chart={chart} />

          {/* Combined blueprint — what your three pillars mean together */}
          {bpSun && bpMoon && (
            <BlueprintCard
              sunSign={bpSun}
              moonSign={bpMoon}
              lagnaSign={bpRising}
              isWestern={isWestern}
            />
          )}

          {/* Key placements — tropical Sun/Moon/Rising for Western, rashi + nakshatra for Vedic */}
          <div className="grid grid-cols-1 gap-3 w-full mb-8">
            {isWestern ? (
              <>
                {bpSun && <PlacementCard role="sun" label="Sun Sign (Tropical)" sign={bpSun} />}
                {bpMoon && <PlacementCard role="moon" label="Moon Sign (Tropical)" sign={bpMoon} />}
                {bpRising && <PlacementCard role="lagna" label="Rising (Ascendant)" sign={bpRising} />}
              </>
            ) : (
              <>
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
              </>
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
  isWestern?: boolean
}

function BlueprintCard({ sunSign, moonSign, lagnaSign, isWestern }: BlueprintCardProps) {
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
        chart ({isWestern ? 'houses and aspects' : 'houses, dashas, yogas'}) refines all of this.
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
