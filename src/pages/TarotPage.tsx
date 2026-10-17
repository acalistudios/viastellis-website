import { useNatalChart } from '@/hooks/useNatalChart'
import { TarotSection } from '@/components/home/TarotSection'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'

/**
 * TarotPage — the daily draw as its own screen, opened from Home's Tarot card.
 * Same TarotSection the Chart hub's Tarot tab renders, so draws stay in sync.
 */
export function TarotPage() {
  const { chart, loading } = useNatalChart()

  return (
    <div className="flex flex-col items-center px-6 pt-6 pb-10 max-w-lg lg:max-w-3xl mx-auto w-full">
      <div className="w-full mb-4 text-left">
        <h1 className="font-display text-2xl text-stardust-300">Tarot</h1>
        <p className="text-slate-400 text-sm mt-0.5">Draw a card for today, or lay out a spread</p>
      </div>

      {loading || !chart ? (
        <span className="w-8 h-8 rounded-full border-2 border-stardust-400 border-t-transparent animate-spin my-12" />
      ) : (
        <TarotSection chart={chart} />
      )}

      <p className="mt-8 text-[11px] text-slate-600 max-w-xs text-center">{ENTERTAINMENT_DISCLAIMER}</p>
    </div>
  )
}
