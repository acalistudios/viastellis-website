/**
 * HoroscopeFeedback — one-tap "did this land?" under the daily horoscope.
 *
 * Deliberately cheap to answer: a single tap records the rating, and the
 * optional note is offered only AFTER that tap, so the user is never staring at
 * a blank page (the reason the Cosmic Journal sits unused).
 *
 * A note is written to horoscope_feedback.note AND mirrored into
 * journal_entries with the same sky stamp, so check-ins count toward the 3
 * entries that unlock Stella's journal pattern scan.
 *
 * Requires supabase/migrations/2026-08-04_horoscope_feedback.sql. If that table
 * is missing the widget hides itself rather than erroring — this sits on the
 * home screen, so it must never break the page when the migration lags a deploy.
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/store/UserContext'
import { InfoBubble } from '@/components/ui/InfoBubble'
import { currentSkyContext, localDateStr } from '@/lib/skyContext'
import type { HoroscopeLens } from '@/lib/horoscope'
import type { ZodiacSign } from '@/types'

const OPTIONS = [
  { rating: 1, emoji: '👍', label: 'Spot on' },
  { rating: 0, emoji: '😐', label: 'Kind of' },
  { rating: -1, emoji: '👎', label: 'Not really' },
] as const

/** Why bother answering — the payoff isn't obvious until you've built up a few entries. */
function JournalInfo() {
  return (
    <InfoBubble title="Why track this?" align="center">
      Every answer is saved to your Cosmic Journal and stamped with the sky at that
      moment — the Moon's sign and nakshatra, the tithi, and how the day's Moon sat
      against your natal one.
      <br />
      <br />
      Once you have a few entries, Stella can read them back and look for patterns —
      which kinds of days actually tend to land well for <em>you</em>, rather than in
      general. The more you note, the more specific she gets.
    </InfoBubble>
  )
}

interface Props {
  lens: HoroscopeLens
  /** Human-readable lens name, used in the journal mirror ("Moon", "Personalized"). */
  lensTitle: string
  /** Natal Moon sign — enables the gochara field on the sky stamp. */
  natalMoonSign?: ZodiacSign
}

export function HoroscopeFeedback({ lens, lensTitle, natalMoonSign }: Props) {
  const { user } = useUser()
  const date = localDateStr()

  const [rating, setRating] = useState<number | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  // Reflect what they already said today for THIS lens (ratings are per lens).
  useEffect(() => {
    if (!user) return
    let cancelled = false
    setRating(null)
    setNoteOpen(false)
    setNote('')
    setNoteSaved(false)
    void supabase
      .from('horoscope_feedback')
      .select('rating, note')
      .eq('user_id', user.id)
      .eq('horoscope_date', date)
      .eq('lens', lens)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        // Missing table (migration not yet applied) → hide, don't shout.
        if (error && error.message.includes('horoscope_feedback')) {
          setUnavailable(true)
          return
        }
        if (data) {
          setRating(data.rating as number)
          if (data.note) { setNote(data.note as string); setNoteSaved(true) }
        }
      })
    return () => { cancelled = true }
  }, [user, date, lens])

  async function rate(value: number) {
    if (!user || busy) return
    setBusy(true)
    const previous = rating
    setRating(value) // optimistic — a tap should feel instant
    try {
      const { error } = await supabase.from('horoscope_feedback').upsert(
        {
          user_id: user.id,
          horoscope_date: date,
          lens,
          rating: value,
          sky_context: currentSkyContext(natalMoonSign),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,horoscope_date,lens' },
      )
      if (error) throw error
    } catch (err) {
      setRating(previous) // roll back the optimistic tap
      if (err instanceof Error && err.message.includes('horoscope_feedback')) setUnavailable(true)
    } finally {
      setBusy(false)
    }
  }

  async function saveNote() {
    if (!user || !note.trim() || busy) return
    setBusy(true)
    try {
      const sky = currentSkyContext(natalMoonSign)
      const chosen = OPTIONS.find((o) => o.rating === rating)

      const { error } = await supabase.from('horoscope_feedback').upsert(
        {
          user_id: user.id,
          horoscope_date: date,
          lens,
          rating: rating ?? 0,
          note: note.trim().slice(0, 2000),
          sky_context: sky,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,horoscope_date,lens' },
      )
      if (error) throw error

      // Mirror into the journal so the entry reads on its own later, and so it
      // counts toward the 3 entries that unlock the pattern scan.
      await supabase.from('journal_entries').insert({
        user_id: user.id,
        body: `Horoscope check-in — ${lensTitle} reading${chosen ? ` · ${chosen.label}` : ''}\n\n${note.trim()}`,
        mood: null,
        sky_context: sky,
      })

      setNoteSaved(true)
      setNoteOpen(false)
    } catch (err) {
      if (err instanceof Error && err.message.includes('horoscope_feedback')) setUnavailable(true)
    } finally {
      setBusy(false)
    }
  }

  if (unavailable || !user) return null

  return (
    <div className="mt-4 pt-3 border-t border-cosmos-800/70">
      {rating === null ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-500 inline-flex items-center gap-1.5">
            Was this accurate?
            <JournalInfo />
          </span>
          {OPTIONS.map((o) => (
            <button
              key={o.rating}
              onClick={() => void rate(o.rating)}
              disabled={busy}
              title={o.label}
              aria-label={o.label}
              className="w-8 h-8 rounded-full text-base transition-all hover:bg-cosmos-800 hover:scale-110 disabled:opacity-50"
            >
              {o.emoji}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-500">
              {OPTIONS.find((o) => o.rating === rating)?.emoji} Noted — thank you.
            </span>
            {!noteSaved && !noteOpen && (
              <button
                onClick={() => setNoteOpen(true)}
                className="text-[11px] text-stardust-400 hover:text-stardust-300 transition-colors"
              >
                Add a note to your journal →
              </button>
            )}
            {/* Same explainer, offered again at the moment they choose whether to write. */}
            {!noteSaved && !noteOpen && <JournalInfo />}
            {!noteOpen && (
              <button
                onClick={() => setRating(null)}
                className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors ml-auto"
              >
                change
              </button>
            )}
          </div>

          {noteSaved && (
            <p className="text-[11px] text-emerald-400/80 mt-1.5">
              Saved to your journal ✓
            </p>
          )}

          {noteOpen && (
            <div className="mt-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What actually happened today?"
                rows={2}
                maxLength={2000}
                autoFocus
                className="w-full bg-cosmos-800 border border-cosmos-600 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-600 text-xs resize-none focus:outline-none focus:border-stardust-400"
              />
              <div className="flex items-center justify-end gap-2 mt-1.5">
                <button
                  onClick={() => { setNoteOpen(false); setNote('') }}
                  className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void saveNote()}
                  disabled={busy || !note.trim()}
                  className="text-[11px] font-medium rounded-full px-3 py-1 bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 disabled:opacity-50"
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
