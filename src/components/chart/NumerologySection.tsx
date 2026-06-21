/**
 * NumerologySection — Pythagorean numerology from birth date + name.
 * Four core numbers: Life Path, Expression, Soul Urge, Birthday.
 * Fully deterministic, no AI, no credits.
 */

import { useMemo, useState } from 'react'
import {
  lifePathNumber,
  expressionNumber,
  soulUrgeNumber,
  birthdayNumber,
  NUMBER_MEANINGS,
} from '@/lib/numerology'
import type { NatalChart } from '@/types'

interface Props {
  chart: NatalChart
}

export function NumerologySection({ chart }: Props) {
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

  return (
    <div className="mt-6 mb-2">
      <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-3 px-1">Numerology</p>
      <div className="flex flex-col gap-3">
        {numbers.map(({ key, label, n, desc }) => (
          <NumberCard key={key} label={label} number={n} subLabel={desc} />
        ))}
      </div>
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
