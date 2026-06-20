/**
 * Cosmic Journal — feature #10.
 *
 * Entries are stamped at write time with the day's sky context (Moon sign,
 * nakshatra, gochara quality, tithi). Stella can scan recent entries for
 * patterns against the sky data. Requires the journal_entries table
 * (supabase/migrations/2026-06-12_journal_entries.sql).
 */

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/store/UserContext'
import { useNatalChart } from '@/hooks/useNatalChart'
import { moonSiderealDeg, moonGocharaQuality, signFromDeg, getNakshatra } from '@/lib/ephemeris'
import { getPanchanga } from '@/lib/panchanga'
import { streamStella } from '@/lib/gemini'
import { CreditCost } from '@/components/ui/CreditCost'
import { CREDIT_COSTS } from '@/config/creditCosts'
import { Button } from '@/components/ui/Button'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'
import type { ZodiacSign } from '@/types'

const MOODS = ['😊', '😌', '😐', '😔', '😤', '🤯']

interface Entry {
  id: string
  body: string
  mood: string | null
  sky_context: Record<string, unknown> | null
  created_at: string
}

export function JournalPage() {
  const { session, user } = useUser()
  const { chart } = useNatalChart()

  const [entries, setEntries] = useState<Entry[]>([])
  const [body, setBody] = useState('')
  const [mood, setMood] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tableMissing, setTableMissing] = useState(false)
  const [patterns, setPatterns] = useState('')
  const [scanning, setScanning] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error: dbError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (dbError) {
      // 42P01 = relation does not exist → migration not yet run
      if (dbError.code === '42P01' || dbError.message.includes('journal_entries')) {
        setTableMissing(true)
      }
      return
    }
    setEntries((data ?? []) as Entry[])
  }, [user])

  useEffect(() => { void load() }, [load])

  function currentSkyContext() {
    const now = new Date()
    const moonDeg = moonSiderealDeg(now)
    const moonSign = signFromDeg(moonDeg) as ZodiacSign
    const natalMoonSign = chart?.planets.find(p => p.planet === 'Moon')?.sign
    const p = getPanchanga(now)
    return {
      moon_sign: moonSign,
      nakshatra: getNakshatra(moonDeg).name,
      gochara: natalMoonSign ? moonGocharaQuality(natalMoonSign, moonSign).quality : null,
      tithi: `${p.tithi.name} (${p.tithi.paksha})`,
      phase: p.moonPhase.name,
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !body.trim()) return
    setSaving(true)
    setError('')
    try {
      const { error: dbError } = await supabase.from('journal_entries').insert({
        user_id: user.id,
        body: body.trim(),
        mood,
        sky_context: currentSkyContext(),
      })
      if (dbError) throw dbError
      setBody('')
      setMood(null)
      void load()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save.'
      if (msg.includes('journal_entries')) setTableMissing(true)
      else setError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function scanPatterns() {
    if (!session || entries.length < 3 || scanning) return
    setScanning(true)
    setPatterns('')
    try {
      const sample = entries.slice(0, 15).map(e => {
        const sky = e.sky_context as { gochara?: string; nakshatra?: string; tithi?: string } | null
        return `[${new Date(e.created_at).toLocaleDateString()}${e.mood ? ` ${e.mood}` : ''} · ${sky?.gochara ?? '?'} day, ${sky?.nakshatra ?? '?'}] ${e.body.slice(0, 150)}`
      }).join('\n')

      const prompt =
        `Here are recent journal entries with their sky-context stamps (gochara quality + Moon nakshatra at writing time):\n${sample}\n\n` +
        `In ~110 words, gently note any patterns between the sky data and the entries' tone (e.g. moods on challenging vs flowing days). ` +
        `If no clear pattern exists, say so honestly. Flowing prose, warm, no headings.`

      let acc = ''
      for await (const chunk of streamStella(prompt, { persona: 'warm' }, session.access_token)) {
        acc += chunk
        setPatterns(acc)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Stella could not scan for patterns.')
    } finally {
      setScanning(false)
    }
  }

  if (tableMissing) {
    return (
      <div className="px-6 py-12 max-w-lg mx-auto text-center">
        <h1 className="font-display text-3xl text-stardust-300 mb-4">Cosmic Journal</h1>
        <p className="text-slate-400 text-sm bg-cosmos-900 border border-cosmos-700 rounded-2xl px-5 py-4">
          One-time setup needed: run the SQL in{' '}
          <code className="text-stardust-300 text-xs">supabase/migrations/2026-06-12_journal_entries.sql</code>{' '}
          in your Supabase SQL editor, then reload this page.
        </p>
      </div>
    )
  }

  return (
    <div className="px-5 py-8 max-w-lg mx-auto">
      <h1 className="font-display text-3xl text-stardust-300 text-center mb-1">Cosmic Journal</h1>
      <p className="text-slate-500 text-xs text-center mb-8">
        Every entry is stamped with that moment's sky
      </p>

      {/* New entry */}
      <form onSubmit={handleSubmit} className="mb-6">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="How are you, really?"
          rows={3}
          maxLength={4000}
          className="w-full bg-cosmos-800 border border-cosmos-600 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 text-sm resize-none focus:outline-none focus:border-stardust-400"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1">
            {MOODS.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(mood === m ? null : m)}
                className={[
                  'w-9 h-9 rounded-full text-lg transition-all',
                  mood === m ? 'bg-stardust-400/20 ring-1 ring-stardust-400 scale-110' : 'hover:bg-cosmos-800',
                ].join(' ')}
              >
                {m}
              </button>
            ))}
          </div>
          <Button type="submit" size="sm" isLoading={saving} disabled={!body.trim()}>
            Save
          </Button>
        </div>
      </form>

      {/* Pattern scan */}
      {entries.length >= 3 && (
        <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl px-5 py-4 mb-6">
          {patterns ? (
            <>
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Patterns Stella noticed</p>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {patterns}
                {scanning && <span className="inline-block w-2 h-4 ml-0.5 bg-stardust-400 animate-pulse align-text-bottom rounded-sm" />}
              </p>
            </>
          ) : (
            <button
              onClick={() => void scanPatterns()}
              disabled={scanning}
              className="text-xs text-stardust-400 hover:text-stardust-300 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
            >
              {scanning ? 'Stella is reading your entries…' : '✨ Ask Stella to spot patterns with the sky'}
              {!scanning && <CreditCost credits={CREDIT_COSTS.journal} />}
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="text-rose-400 text-xs bg-rose-400/10 border border-rose-400/20 rounded-lg px-4 py-3 mb-6 text-center">{error}</p>
      )}

      {/* Entries */}
      <div className="flex flex-col gap-3 mb-8">
        {entries.map(e => {
          const sky = e.sky_context as { moon_sign?: string; nakshatra?: string; gochara?: string; phase?: string } | null
          return (
            <div key={e.id} className="bg-cosmos-900 border border-cosmos-700 rounded-2xl px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-500 text-[11px]">
                  {new Date(e.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {e.mood && <span className="ml-2 text-sm">{e.mood}</span>}
                </p>
                {sky && (
                  <p className="text-slate-600 text-[10px]">
                    ☽ {sky.moon_sign} · {sky.nakshatra}
                    {sky.gochara && (
                      <span className={
                        sky.gochara === 'favorable' ? ' text-emerald-400/70'
                          : sky.gochara === 'challenging' ? ' text-rose-400/70'
                          : ''
                      }> · {sky.gochara}</span>
                    )}
                  </p>
                )}
              </div>
              <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{e.body}</p>
            </div>
          )
        })}
        {entries.length === 0 && (
          <p className="text-slate-600 text-sm text-center py-8">
            No entries yet — your first one gets stamped with tonight's sky. 🌙
          </p>
        )}
      </div>

      <p className="text-[11px] text-slate-600 text-center max-w-xs mx-auto">{ENTERTAINMENT_DISCLAIMER}</p>
    </div>
  )
}
