/**
 * Stella — AI astrologer chat (Task 6)
 *
 * - Streams responses from the stella-chat Supabase Edge Function
 * - Persona selector (warm / stoic / sassy)
 * - Sends the user's computed natal chart as context
 * - Entertainment disclaimer pinned at top
 */

import { useState, useRef, useEffect, useMemo, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/store/UserContext'
import { CREDIT_COSTS, creditLabel } from '@/config/creditCosts'
import { useNatalChart } from '@/hooks/useNatalChart'
import { birthDataToJde } from '@/lib/ephemeris'
import { calculateVimshottari, findCurrentDasha } from '@/lib/dasha'
import { streamStella } from '@/lib/gemini'
import { buildPersonaContext } from '@/lib/personalization'
import { MarkdownText } from '@/components/ui/MarkdownText'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'
import type { ChatMessage, StellaPersona } from '@/types'

const SUGGESTIONS = [
  'What does my Moon nakshatra say about me?',
  'Tell me about my rising sign',
  'What are my chart’s strengths?',
]

export function StellaPage() {
  const { session, profile, personalization, memories } = useUser()
  const { chart } = useNatalChart()

  // Stella's personality is chosen in Settings (defaults to warm); no in-chat picker.
  const persona: StellaPersona = profile?.stella_persona ?? 'warm'

  // Personalization block injected into Stella's system prompt (see personalization.ts).
  const personaBlock = useMemo(
    () => buildPersonaContext({
      personalization,
      birthDate: chart?.birth_data.date ?? null,
      memories: memories.map(m => m.note),
    }),
    [personalization, memories, chart],
  )

  // Current Vimshottari period — gives Stella life-chapter context
  const currentDasha = useMemo(() => {
    if (!chart) return null
    const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
    const moon = chart.planets.find(p => p.planet === 'Moon')!
    const moonDeg = SIGNS.indexOf(moon.sign) * 30 + moon.degree
    const jde = birthDataToJde(
      chart.birth_data.date,
      chart.birth_data.time_unknown ? null : chart.birth_data.time,
      chart.birth_data.timezone
    )
    const wheel = calculateVimshottari(moonDeg, new Date((jde - 2440587.5) * 86400000))
    return findCurrentDasha(wheel)
  }, [chart])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || streaming || !session) return

    setError('')
    setInput('')

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    }
    const stellaMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'stella',
      text: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    }

    // History BEFORE this exchange, in Gemini format
    const history = messages.map(m => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      text: m.text,
    }))

    setMessages(prev => [...prev, userMsg, stellaMsg])
    setStreaming(true)

    try {
      // Send a compact chart summary (not the full object) to keep tokens low
      const chartData = chart
        ? {
            name: chart.birth_data.name,
            ayanamsa: chart.ayanamsa,
            ascendant: chart.birth_data.time_unknown ? 'unknown (no birth time)' : chart.ascendant,
            current_dasha: currentDasha
              ? `${currentDasha.maha.lord} mahadasha (until ${currentDasha.maha.end.toISOString().slice(0, 10)}), ${currentDasha.antar.lord} antardasha`
              : undefined,
            planets: chart.planets
              .filter(p => p.planet !== 'Ascendant')
              .map(p => ({
                planet: p.planet,
                sign: p.sign,
                degree: Math.round(p.degree * 10) / 10,
                house: chart.birth_data.time_unknown ? undefined : p.house,
                nakshatra: `${p.nakshatra} pada ${p.nakshatra_pada}`,
                retrograde: p.retrograde || undefined,
              })),
          }
        : undefined

      for await (const chunk of streamStella(
        trimmed,
        { chartData, persona, history, profile: personaBlock || undefined },
        session.access_token
      )) {
        setMessages(prev =>
          prev.map(m => (m.id === stellaMsg.id ? { ...m, text: m.text + chunk } : m))
        )
      }

      setMessages(prev =>
        prev.map(m => (m.id === stellaMsg.id ? { ...m, isStreaming: false } : m))
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Stella is unavailable right now.'
      setError(msg)
      // Remove the empty Stella bubble on failure
      setMessages(prev => prev.filter(m => m.id !== stellaMsg.id || m.text.length > 0))
    } finally {
      setStreaming(false)
      // Refresh session in case token was near expiry
      void supabase.auth.getSession()
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void sendMessage(input)
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-cosmos-800">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-stardust-300">Stella</h1>
          <span className="text-[10px] text-slate-600 max-w-[55%] text-right leading-tight">
            {ENTERTAINMENT_DISCLAIMER}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 text-center gap-6">
            <div>
              <p className="text-4xl mb-3">✨</p>
              <p className="text-slate-300">Hi{chart ? `, ${chart.birth_data.name}` : ''} — I'm Stella.</p>
              <p className="text-slate-500 text-sm mt-1">Ask me anything about your chart.</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => void sendMessage(s)}
                  className="bg-cosmos-900 hover:bg-cosmos-800 border border-cosmos-700 rounded-xl px-4 py-3 text-sm text-slate-400 hover:text-slate-200 transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => (
          <div
            key={m.id}
            className={[
              'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
              m.role === 'user'
                ? 'self-end bg-stardust-400/20 text-slate-100 rounded-br-sm'
                : 'self-start bg-cosmos-800 text-slate-200 rounded-bl-sm border border-cosmos-700',
            ].join(' ')}
          >
            <MarkdownText
              text={m.text}
              trailing={m.isStreaming && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-stardust-400 animate-pulse align-text-bottom rounded-sm" />
              )}
            />
          </div>
        ))}

        {error && (
          <p className="self-center text-rose-400 text-xs bg-rose-400/10 border border-rose-400/20 rounded-lg px-4 py-2.5 text-center">
            {error}
          </p>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-5 pb-4 pt-2 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask Stella…"
          disabled={streaming}
          className="flex-1 bg-cosmos-800 border border-cosmos-600 rounded-full px-5 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-stardust-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="w-12 h-12 rounded-full bg-stardust-400 hover:bg-stardust-300 disabled:opacity-40 text-cosmos-950 flex items-center justify-center transition-colors shrink-0"
          aria-label="Send"
        >
          {streaming ? (
            <span className="w-4 h-4 rounded-full border-2 border-cosmos-950 border-t-transparent animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </form>
      {profile?.subscription_tier !== 'premium' && (
        <p className="px-5 pb-3 -mt-1 text-[10px] text-slate-600 text-center">
          {creditLabel(CREDIT_COSTS.chat)} per message
        </p>
      )}
    </div>
  )
}
