/**
 * NumerologySection — Pythagorean numerology from birth date + name.
 * Four core numbers: Life Path, Expression, Soul Urge, Birthday.
 * Fully deterministic, no AI, no credits.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  lifePathNumber,
  expressionNumber,
  soulUrgeNumber,
  birthdayNumber,
  NUMBER_MEANINGS,
} from '@/lib/numerology'
import { getReport } from '@/lib/report'
import { creditLabel } from '@/config/creditCosts'
import { useUser } from '@/store/UserContext'
import { CREDIT_COSTS } from '@/config/creditCosts'
import type { NatalChart } from '@/types'

interface Props {
  chart: NatalChart
}

export function NumerologySection({ chart }: Props) {
  const { profile } = useUser()
  const isPremium = profile?.subscription_tier === 'premium'

  const numbers = useMemo(() => {
    const name = chart.birth_data.name
    const date = chart.birth_data.date
    return [
      { key: 'lifePath',    label: 'Life Path',   n: lifePathNumber(date),    desc: 'The core lesson and purpose you are here to fulfil.' },
      { key: 'expression',  label: 'Expression',  n: expressionNumber(name),  desc: 'Your natural talents and the energy you project into the world.' },
      { key: 'soulUrge',    label: 'Soul Urge',   n: soulUrgeNumber(name),    desc: 'Your deepest inner motivation — what your heart truly craves.' },
      { key: 'birthday',    label: 'Birthday',    n: birthdayNumber(date),    desc: 'A special gift or skill you bring to this lifetime.' },
    ]
  }, [chart])

  const numerologyContext = useMemo(() => ({
    name: chart.birth_data.name,
    life_path: String(numbers[0].n),
    expression: String(numbers[1].n),
    soul_urge: String(numbers[2].n),
    birthday: String(numbers[3].n),
  }), [chart, numbers])

  return (
    <div className="mt-6 mb-2">
      <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-3 px-1">Numerology</p>
      <div className="flex flex-col gap-3">
        {numbers.map(({ key, label, n, desc }) => (
          <NumberCard key={key} label={label} number={n} subLabel={desc} />
        ))}
      </div>
      <NumerologyReportCard context={numerologyContext} isPremium={isPremium} />
    </div>
  )
}

function NumberCard({ label, number, subLabel }: { label: string; number: number; subLabel: string }) {
  const [open, setOpen] = useState(label === 'Life Path')
  const meaning = NUMBER_MEANINGS[number]
  const isMaster = number === 11 || number === 22 || number === 33

  return (
    <button
      onClick={() => setOpen(o => !o)}
      className="w-full text-left bg-cosmos-900 border border-cosmos-700 rounded-2xl px-5 py-4 transition-colors hover:border-cosmos-600"
    >
      <div className="flex items-center gap-4">
        {/* Big number */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
          ${isMaster
            ? 'bg-gradient-to-br from-stardust-400/30 to-stellar-300/30 border border-stardust-400/50'
            : 'bg-cosmos-800 border border-cosmos-700'}`}>
          <span className={`font-display text-xl ${isMaster ? 'text-stardust-300' : 'text-slate-200'}`}>
            {number}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-slate-100 text-sm font-medium">{label}</p>
            {isMaster && (
              <span className="text-[9px] uppercase tracking-wider text-stardust-300 border border-stardust-400/40 rounded-full px-1.5 py-0.5">
                master
              </span>
            )}
            {meaning && (
              <p className="text-stardust-300 text-xs ml-auto">{meaning.title}</p>
            )}
          </div>
          {!open && (
            <p className="text-slate-500 text-xs mt-0.5 truncate">{subLabel}</p>
          )}
        </div>

        <span className="text-slate-600 text-xs flex-shrink-0">{open ? '▲' : '▼'}</span>
      </div>

      {open && meaning && (
        <div className="mt-3 pt-3 border-t border-cosmos-800">
          <p className="text-xs text-stardust-300/70 mb-1.5">{meaning.keywords.join(' · ')}</p>
          <p className="text-slate-300 text-sm leading-relaxed">{meaning.body}</p>
        </div>
      )}
    </button>
  )
}

// ── Paid report card ─────────────────────────────────────────────────────────

interface NumerologyContext {
  name: string
  life_path: string
  expression: string
  soul_urge: string
  birthday: string
}

function NumerologyReportCard({ context, isPremium }: { context: NumerologyContext; isPremium: boolean }) {
  const COST = CREDIT_COSTS.report_numerology
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')

  async function load(unlock = false) {
    setError('')
    if (unlock) setLoading(true)
    try {
      const res = await getReport({ kind: 'numerology', context, unlock })
      if (res.body) { setBody(res.body); setLocked(false) }
      else if (res.locked) setLocked(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the report.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(false) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mt-4 bg-gradient-to-br from-cosmos-800/80 to-cosmos-900/80 border border-stellar-300/30 rounded-2xl px-5 py-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] uppercase tracking-widest text-stellar-300">Full Reading</p>
        <span className="text-base">🔢</span>
      </div>
      <h2 className="text-slate-100 font-display text-xl mb-1">Your Numerology Portrait</h2>

      {body ? (
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mt-3">{body}</p>
      ) : loading ? (
        <p className="text-slate-500 text-xs mt-2">Checking…</p>
      ) : locked ? (
        <>
          <p className="text-slate-400 text-sm mt-1 mb-4">
            A full ~600-word synthesis of all four of your core numbers — how they interact,
            where they harmonise, and where they create productive tension.
          </p>
          <button
            onClick={() => void load(true)}
            disabled={loading}
            className="rounded-full px-5 py-2 bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-semibold disabled:opacity-60"
          >
            {isPremium ? 'Generate report (free on Premium)' : `Unlock report · ${creditLabel(COST)}`}
          </button>
          {!isPremium && (
            <p className="text-[10px] text-slate-600 mt-2">
              One-time · about ${(COST * 0.1).toFixed(2)} in credits · yours to keep · free on{' '}
              <Link to="/upgrade" className="underline">Premium</Link>
            </p>
          )}
        </>
      ) : null}

      {error && (
        <p className="text-rose-400 text-xs mt-2">
          {error}{' '}
          {error.includes('credit') && <Link to="/upgrade" className="underline">Get credits</Link>}
        </p>
      )}
    </div>
  )
}
