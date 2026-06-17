/**
 * Decision Assistant ("Should I?") — Task 9
 *
 * The verdict is deterministic — today's Moon gochara relative to the user's
 * natal Moon (favorable → green light, neutral → reflect, challenging → caution).
 * Stella then writes a short narrative around it (degrades gracefully if the
 * Edge Function isn't deployed).
 */

import { useMemo, useState, useEffect, useCallback, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/store/UserContext'
import { useNatalChart } from '@/hooks/useNatalChart'
import { getTransitSnapshot, moonGocharaQuality, signFromDeg, moonSiderealDeg } from '@/lib/ephemeris'
import { streamStella } from '@/lib/gemini'
import { Button } from '@/components/ui/Button'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'
import type { DecisionAnswer, ZodiacSign } from '@/types'

const VERDICTS: Record<DecisionAnswer, { emoji: string; title: string; color: string; blurb: string }> = {
  green_light: {
    emoji: '🟢',
    title: 'Green Light',
    color: 'text-emerald-300',
    blurb: 'The sky is flowing with you today.',
  },
  reflect: {
    emoji: '🟡',
    title: 'Reflect First',
    color: 'text-stellar-300',
    blurb: 'A steady, in-between sky — clarity comes before action.',
  },
  caution: {
    emoji: '🔴',
    title: 'Gentle Caution',
    color: 'text-rose-300',
    blurb: 'The Moon transits a tender zone for you — maybe sleep on it.',
  },
}

const EXAMPLES = [
  'Should I ask for a raise this week?',
  'Should I book that trip?',
  'Should I have the difficult conversation today?',
]

interface DecisionHistoryItem {
  id: string
  question: string
  answer: DecisionAnswer
  created_at: string
}

export function DecisionPage() {
  const { session, user } = useUser()
  const { chart, chartId, loading } = useNatalChart()

  const [question, setQuestion] = useState('')
  const [asked, setAsked] = useState('')
  const [verdict, setVerdict] = useState<DecisionAnswer | null>(null)
  const [narrative, setNarrative] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<DecisionHistoryItem[]>([])

  const loadHistory = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('decision_reports')
      .select('id, question, answer, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) setHistory(data as DecisionHistoryItem[])
  }, [user])

  useEffect(() => { void loadHistory() }, [loadHistory])

  // Today's sky, computed once per page view
  const sky = useMemo(() => {
    const now = new Date()
    const transits = getTransitSnapshot(now)
    const transitMoonSign = signFromDeg(moonSiderealDeg(now)) as ZodiacSign
    return { transits, transitMoonSign }
  }, [])

  const natalMoonSign = chart?.planets.find(p => p.planet === 'Moon')?.sign ?? null

  async function handleAsk(text: string) {
    const q = text.trim()
    if (!q || !chart || !natalMoonSign || streaming) return

    setError('')
    setNarrative('')
    setAsked(q)
    setQuestion('')

    // Deterministic verdict from today's Moon gochara
    const g = moonGocharaQuality(natalMoonSign, sky.transitMoonSign)
    const answer: DecisionAnswer =
      g.quality === 'favorable' ? 'green_light' : g.quality === 'challenging' ? 'caution' : 'reflect'
    setVerdict(answer)

    const transitSummary = sky.transits
      .map(t => `${t.planet} in ${t.sign}${t.retrograde ? ' (retrograde)' : ''}`)
      .join(', ')
    let finalNarrative = ''

    // Stella narrative
    if (!session) {
      void persistReport(q, answer, finalNarrative)
      return
    }
    setStreaming(true)
    try {
      const prompt =
        `The user asks: "${q}". ` +
        `Today's verdict (already decided by transit math, do not change it): ${VERDICTS[answer].title}. ` +
        `Reason: transiting Moon in ${sky.transitMoonSign} is in the ${g.houseFromMoon}th sign from their natal Moon in ${natalMoonSign}` +
        `${g.isChandrashtama ? ' (chandrashtama)' : ''}. ` +
        `Today's sky: ${transitSummary}. ` +
        `Write a short (~100 words) response explaining this verdict for their specific question, in flowing prose. ` +
        `Do not give actual advice on the underlying decision — speak only through astrological symbolism.`

      let text = ''
      for await (const chunk of streamStella(prompt, { persona: 'warm' }, session.access_token)) {
        text += chunk
        setNarrative(text)
      }
      finalNarrative = text
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Stella could not elaborate right now.')
    } finally {
      setStreaming(false)
    }

    void persistReport(q, answer, finalNarrative)
  }

  /** Save the report to history (best-effort, never blocks the UI). */
  async function persistReport(q: string, answer: DecisionAnswer, reasoning: string) {
    if (!user || !chartId) return
    try {
      const transits = sky.transits.map(
        t => `${t.planet} in ${t.sign}${t.retrograde ? ' (R)' : ''}`
      )
      await supabase.from('decision_reports').insert({
        user_id: user.id,
        chart_id: chartId,
        question: q,
        answer,
        reasoning: reasoning || null,
        transits,
      })
      void loadHistory()
    } catch { /* best-effort */ }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void handleAsk(question)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full py-24">
        <span className="w-8 h-8 rounded-full border-2 border-stardust-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-5 py-8 max-w-lg mx-auto">
      <h1 className="font-display text-3xl text-stardust-300 text-center mb-1">Should I?</h1>
      <p className="text-slate-500 text-xs text-center mb-8">
        Ask the sky about timing — today, through your chart
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-6">
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Should I…?"
          rows={2}
          disabled={streaming}
          className="w-full bg-cosmos-800 border border-cosmos-600 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 text-sm resize-none focus:outline-none focus:border-stardust-400 disabled:opacity-50"
        />
        <Button type="submit" size="lg" disabled={!question.trim() || streaming} isLoading={streaming}>
          Ask the Sky
        </Button>
      </form>

      {!verdict && (
        <div className="flex flex-col gap-2 mb-6">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => void handleAsk(ex)}
              className="bg-cosmos-900 hover:bg-cosmos-800 border border-cosmos-700 rounded-xl px-4 py-3 text-sm text-slate-400 hover:text-slate-200 transition-colors text-left"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {verdict && (
        <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl p-6 mb-6">
          <p className="text-slate-500 text-xs mb-3 italic">"{asked}"</p>
          <div className="text-center mb-4">
            <p className="text-5xl mb-2">{VERDICTS[verdict].emoji}</p>
            <p className={`font-display text-2xl ${VERDICTS[verdict].color}`}>{VERDICTS[verdict].title}</p>
            <p className="text-slate-500 text-xs mt-1">{VERDICTS[verdict].blurb}</p>
          </div>

          {(narrative || streaming) && (
            <div className="border-t border-cosmos-700 pt-4">
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Stella's take</p>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {narrative}
                {streaming && (
                  <span className="inline-block w-2 h-4 ml-0.5 bg-stardust-400 animate-pulse align-text-bottom rounded-sm" />
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-rose-400 text-xs bg-rose-400/10 border border-rose-400/20 rounded-lg px-4 py-3 mb-6 text-center">
          {error}
        </p>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm text-slate-400 font-medium mb-3 px-1">Past questions</h2>
          <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl overflow-hidden">
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-3 border-b border-cosmos-800 last:border-0">
                <span className="text-lg shrink-0">{VERDICTS[h.answer].emoji}</span>
                <div className="min-w-0">
                  <p className="text-slate-300 text-sm truncate">{h.question}</p>
                  <p className="text-slate-600 text-[11px]">
                    {new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-600 text-center max-w-xs mx-auto">{ENTERTAINMENT_DISCLAIMER}</p>
    </div>
  )
}
