import { useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useNatalChart } from '@/hooks/useNatalChart'
import { useUser } from '@/store/UserContext'
import { calculateWesternChart } from '@/lib/westernChart'
import { moonGocharaQuality, moonSiderealDeg, signFromDeg } from '@/lib/ephemeris'
import { TodayCard } from '@/components/home/TodayCard'
import { FeatureGrid } from '@/components/home/FeatureGrid'
import { TarotSection } from '@/components/home/TarotSection'
import { TellStellaInvite } from '@/components/personalization/TellStellaInvite'
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

// Labels match TodayCard's QUALITY_COPY; the hint is plain language for newcomers.
const DAY_COPY = {
  favorable:   { label: 'A flowing day',  tone: 'text-emerald-300', hint: 'good energy for action' },
  neutral:     { label: 'A steady day',   tone: 'text-slate-100',   hint: 'keep a gentle rhythm' },
  challenging: { label: 'A tender day',   tone: 'text-rose-300',    hint: 'go easy on yourself' },
} as const

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="w-full text-left text-[11px] uppercase tracking-widest text-slate-500 mb-2">{children}</p>
  )
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
  // Anchor to local noon of the civil day — the same reference the Calendar uses
  // — so "today's" moon illumination matches across the app (not a live instant).
  const moonPhase = useMemo(() => {
    const n = new Date()
    return getPanchanga(new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12)).moonPhase
  }, [])

  // Day quality for the lead tile — the same Moon-from-natal-Moon rule TodayCard uses,
  // so the tile and the full reading below never disagree.
  const today = useMemo(() => {
    if (!moon) return null
    const transitMoonSign = signFromDeg(moonSiderealDeg(new Date())) as ZodiacSign
    return { transitMoonSign, ...moonGocharaQuality(moon.sign, transitMoonSign) }
  }, [moon])
  const dayCopy = today ? DAY_COPY[today.quality] : null

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateLine = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  const firstName = chart?.birth_data.name?.trim().split(/\s+/)[0]

  return (
    <div className="relative flex flex-col items-center px-6 py-10 text-center max-w-lg lg:max-w-3xl mx-auto">
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

      {loading ? (
        <span className="w-8 h-8 rounded-full border-2 border-stardust-400 border-t-transparent animate-spin my-12" />
      ) : chart ? (
        <>
          {/* Greeting — date and tonight's moon, so the page feels like *today* */}
          <div className="w-full flex items-center justify-between gap-4 mb-5 text-left">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-display text-slate-100 leading-tight">
                {greeting}{firstName ? <>, <span className="text-stardust-300">{firstName}</span></> : null}
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">{dateLine}</p>
            </div>
            <div className="flex flex-col items-center shrink-0">
              <MoonPhase illumination={moonPhase.illumination} name={moonPhase.name} size={44} />
              <p className="text-slate-500 text-[11px] mt-1 inline-flex items-center gap-1">
                <span>{moonPhase.illumination}% lit</span>
                <InfoBubble title={`Tonight's Moon · ${moonPhase.name}`} align="right">
                This is the Moon's illuminated fraction right <em>now</em>. It changes continuously,
                so it can differ by a few percent from sources that fix it to a set time of day — ours
                is computed for the current moment. As for meaning: a <strong>waxing</strong> (growing)
                Moon favors building, intention-setting, and starting things; the <strong>Full Moon</strong>{' '}
                brings culmination and release; a <strong>waning</strong> (shrinking) Moon is for letting
                go and rest; the <strong>New Moon</strong> is for fresh starts.
                </InfoBubble>
              </p>
            </div>
          </div>

          {/* App-style launcher — one tap to every pillar */}
          <FeatureGrid
            dayLabel={dayCopy?.label ?? 'Your day'}
            dayTone={dayCopy?.tone ?? 'text-slate-100'}
            moonLine={today ? `Moon in ${today.transitMoonSign} · ${dayCopy?.hint}` : 'See what the sky holds for you'}
          />

          {/* Daily horoscope — the full reading the lead tile jumps to */}
          <SectionLabel>Today for you</SectionLabel>
          <div id="home-today" className="w-full scroll-mt-24">
            <TodayCard chart={chart} />
          </div>

          {/* Daily tarot */}
          <div id="home-tarot" className="w-full scroll-mt-24">
            <TarotSection chart={chart} />
          </div>
          <FullMoonCard chart={chart} />

          {/* Optional: invite the user to personalize (dismissible, hides once engaged) */}
          <TellStellaInvite />

          {/* Combined blueprint — what your three pillars mean together */}
          <SectionLabel>Your chart at a glance</SectionLabel>
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
        </>
      ) : (
        <>
          <img src="/logo.svg" alt="" className="w-14 h-14 mb-2" />
          <h1 className="text-3xl font-display text-stardust-300 mb-1">ViaStellis</h1>
          <p className="text-slate-500 text-sm">Set up your birth chart to get started</p>
        </>
      )}

      <p className="mt-12 text-[11px] text-slate-600 max-w-xs">{ENTERTAINMENT_DISCLAIMER}</p>
      {/* Legal links — static pages served from /public, so use plain anchors */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
        <a href="/terms" className="hover:text-stardust-400 transition-colors">Terms</a>
        <span className="text-cosmos-700">·</span>
        <a href="/privacy" className="hover:text-stardust-400 transition-colors">Privacy</a>
        <span className="text-cosmos-700">·</span>
        <a href="/refund" className="hover:text-stardust-400 transition-colors">Refunds</a>
        <span className="text-cosmos-700">·</span>
        <a href="/contact" className="hover:text-stardust-400 transition-colors">Contact</a>
      </div>
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
