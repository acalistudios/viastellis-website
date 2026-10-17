import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useNatalChart } from '@/hooks/useNatalChart'
import { moonGocharaQuality, moonSiderealDeg, signFromDeg } from '@/lib/ephemeris'
import { FeatureGrid } from '@/components/home/FeatureGrid'
import { TellStellaInvite } from '@/components/personalization/TellStellaInvite'
import { InfoBubble } from '@/components/ui/InfoBubble'
import { MoonPhase } from '@/components/ui/MoonPhase'
import { getPanchanga } from '@/lib/panchanga'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'
import type { ZodiacSign } from '@/types'

/**
 * HomePage — a short app-style launcher: greeting, today's quality, and a card
 * per pillar. The content that used to live here now has its own screens:
 * the full reading at /today, the draw at /tarot, and the blueprint on /chart.
 */

// Labels match TodayCard's QUALITY_COPY; the hint is plain language for newcomers.
const DAY_COPY = {
  favorable:   { label: 'A flowing day',  tone: 'text-emerald-300', hint: 'good energy for action' },
  neutral:     { label: 'A steady day',   tone: 'text-slate-100',   hint: 'keep a gentle rhythm' },
  challenging: { label: 'A tender day',   tone: 'text-rose-300',    hint: 'go easy on yourself' },
} as const

export function HomePage() {
  const { chart, loading } = useNatalChart()
  const [params] = useSearchParams()
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(params.get('checkout') === 'success')

  const moon = chart?.planets.find(p => p.planet === 'Moon')

  // Tonight's moon phase (global — same everywhere on Earth).
  // Anchor to local noon of the civil day — the same reference the Calendar uses
  // — so "today's" moon illumination matches across the app (not a live instant).
  const moonPhase = useMemo(() => {
    const n = new Date()
    return getPanchanga(new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12)).moonPhase
  }, [])

  // Day quality for the lead tile — the same Moon-from-natal-Moon rule TodayCard uses,
  // so the tile and the full reading on /today never disagree.
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

          {/* App-style launcher — one tap to every pillar, each opening its own screen */}
          <FeatureGrid
            dayLabel={dayCopy?.label ?? 'Your day'}
            dayTone={dayCopy?.tone ?? 'text-slate-100'}
            moonLine={today ? `Moon in ${today.transitMoonSign} · ${dayCopy?.hint}` : 'See what the sky holds for you'}
          />

          {/* Optional: invite the user to personalize (dismissible, hides once engaged) */}
          <TellStellaInvite />
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
