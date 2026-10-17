import { useNatalChart } from '@/hooks/useNatalChart'
import { TodayCard } from '@/components/home/TodayCard'
import { FullMoonCard } from '@/components/home/FullMoonCard'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'

/**
 * TodayPage — the daily horoscope as its own screen.
 *
 * Opened from Home's "Today's horoscope" tile. A real route (not an overlay)
 * so the Android back button closes it, and so the daily email or a future
 * notification can link straight to /today.
 */
export function TodayPage() {
  const { chart, loading } = useNatalChart()
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="flex flex-col items-center px-6 pt-6 pb-10 max-w-lg lg:max-w-3xl mx-auto w-full">
      <div className="w-full mb-4 text-left">
        <h1 className="font-display text-2xl text-stardust-300">Today's Horoscope</h1>
        <p className="text-slate-400 text-sm mt-0.5">{dateLine}</p>
      </div>

      {loading || !chart ? (
        <span className="w-8 h-8 rounded-full border-2 border-stardust-400 border-t-transparent animate-spin my-12" />
      ) : (
        <>
          <TodayCard chart={chart} />
          <FullMoonCard chart={chart} />
        </>
      )}

      <p className="mt-8 text-[11px] text-slate-600 max-w-xs text-center">{ENTERTAINMENT_DISCLAIMER}</p>
    </div>
  )
}
