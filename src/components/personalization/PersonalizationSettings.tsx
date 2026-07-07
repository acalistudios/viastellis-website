/**
 * PersonalizationSettings — the Settings home for the personalization profile.
 * Edit mode, pronouns, and focus areas; re-run "Tell Stella about yourself" any
 * time to keep it relevant; and view / edit / clear what Stella remembers.
 */
import { useEffect, useState } from 'react'
import { useUser } from '@/store/UserContext'
import { useNatalChart } from '@/hooks/useNatalChart'
import {
  clearMemories,
  deleteMemory,
  savePersonalization,
  updateMemory,
} from '@/lib/personalizationApi'
import type {
  FocusArea, JobStatus, Kids, Pronouns, RelationshipStatus, StellaMemory, UserPersonalization,
} from '@/types'
import { TellStellaFlow } from './TellStellaFlow'

const PRONOUN_OPTS: Array<{ v: Pronouns; label: string }> = [
  { v: 'she', label: 'she/her' },
  { v: 'he', label: 'he/him' },
  { v: 'they', label: 'they/them' },
  { v: 'prefer_not', label: 'prefer not to say' },
]
const FOCUS_OPTS: Array<{ v: FocusArea; label: string }> = [
  { v: 'love', label: '💛 Love' },
  { v: 'career', label: '💼 Career' },
  { v: 'money', label: '💰 Money' },
  { v: 'health', label: '🌿 Health' },
  { v: 'growth', label: '🌱 Growth' },
]
const RELATIONSHIP_OPTS: Array<{ v: RelationshipStatus; label: string }> = [
  { v: 'single', label: 'Single' },
  { v: 'dating', label: 'In a relationship' },
  { v: 'married', label: 'Married' },
  { v: 'divorced', label: 'Divorced' },
  { v: 'widowed', label: 'Widowed' },
  { v: 'prefer_not', label: 'prefer not to say' },
]
const JOB_OPTS: Array<{ v: JobStatus; label: string }> = [
  { v: 'student', label: 'Student' },
  { v: 'employed', label: 'Employed' },
  { v: 'self_employed', label: 'Self-employed' },
  { v: 'between_jobs', label: 'Between jobs' },
  { v: 'retired', label: 'Retired' },
  { v: 'prefer_not', label: 'prefer not to say' },
]
const KIDS_OPTS: Array<{ v: Kids; label: string }> = [
  { v: 'none', label: 'No kids' },
  { v: 'trying', label: 'None, but trying' },
  { v: 'young', label: 'Young kids' },
  { v: 'teen', label: 'Teens' },
  { v: 'adult', label: 'Adult kids' },
  { v: 'prefer_not', label: 'prefer not to say' },
]

// Toggle a value in a multi-select array. 'prefer not to say' is exclusive.
function toggleMulti<T extends string>(arr: T[], v: T): T[] {
  if (arr.includes(v)) return arr.filter(x => x !== v)
  if (v === 'prefer_not') return [v]
  return [...arr.filter(x => x !== 'prefer_not'), v]
}

/** Format an ISO birth date (YYYY-MM-DD) as "March 15, 1990" without TZ drift. */
function formatBirthday(iso: string | null | undefined): string | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function PersonalizationSettings() {
  const { user, personalization, memories, refreshPersonalization } = useUser()
  const { chart } = useNatalChart()
  const birthday = formatBirthday(chart?.birth_data.date)
  const [draft, setDraft] = useState<UserPersonalization>(personalization)
  const [flowOpen, setFlowOpen] = useState(false)
  const [savedTick, setSavedTick] = useState(false)

  // Keep the local editor in sync when context reloads (e.g. after the flow).
  useEffect(() => { setDraft(personalization) }, [personalization])

  async function save(next: UserPersonalization) {
    setDraft(next)
    if (!user) return
    try {
      await savePersonalization(user.id, next)
      // If they turned off personalization, erase remembered notes.
      if (next.personalization_mode === 'chart_only' && memories.length) {
        await clearMemories(user.id)
      }
      await refreshPersonalization()
      setSavedTick(true)
      setTimeout(() => setSavedTick(false), 1500)
    } catch { /* fail soft (pre-migration) */ }
  }

  const personalized = draft.personalization_mode === 'personalized'

  // A plain-language recap of everything Stella currently knows (declared facts).
  // 'prefer_not' and unset are omitted — she genuinely doesn't know those.
  const labelsFor = <T extends string>(opts: Array<{ v: T; label: string }>, vs: T[]) =>
    vs.filter(v => v !== 'prefer_not').map(v => opts.find(o => o.v === v)?.label ?? null)
  const known: string[] = [
    draft.pronouns && draft.pronouns !== 'prefer_not'
      ? (PRONOUN_OPTS.find(o => o.v === draft.pronouns)?.label ?? null) : null,
    ...draft.focus_areas.map(f => FOCUS_OPTS.find(o => o.v === f)?.label ?? null),
    ...labelsFor(RELATIONSHIP_OPTS, draft.relationship_status),
    ...labelsFor(JOB_OPTS, draft.job_status),
    ...labelsFor(KIDS_OPTS, draft.kids),
  ].filter((x): x is string => Boolean(x))

  return (
    <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl px-5 py-4 mb-6">
      <p className="text-slate-300 text-sm font-medium mb-1">Personalization</p>
      <p className="text-slate-500 text-xs mb-3">
        Help Stella tailor your readings. Everything here is optional and private to you.
      </p>

      {/* Mode toggle */}
      <div className="flex flex-col gap-2 mb-4">
        {([
          ['personalized', 'Personalized', 'Stella remembers your conversations and tailors readings over time.'],
          ['chart_only', 'Chart only', 'Stella uses just your chart and setup info — nothing is remembered.'],
        ] as const).map(([v, label, hint]) => (
          <label key={v} className={[
            'flex items-start gap-3 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors text-sm',
            draft.personalization_mode === v
              ? 'border-stardust-400/50 bg-stardust-400/10 text-stardust-200'
              : 'border-cosmos-700 text-slate-300 hover:border-cosmos-600',
          ].join(' ')}>
            <input type="radio" name="pmode" checked={draft.personalization_mode === v}
              onChange={() => void save({ ...draft, personalization_mode: v })}
              className="accent-stardust-400 mt-0.5" />
            <span>
              <span className="block">{label}</span>
              <span className="block text-slate-500 text-xs mt-0.5">{hint}</span>
            </span>
          </label>
        ))}
      </div>

      {/* Pronouns */}
      <p className="text-slate-400 text-xs mb-2">Pronouns</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {PRONOUN_OPTS.map(o => (
          <Chip key={o.v} active={draft.pronouns === o.v}
            onClick={() => void save({ ...draft, pronouns: draft.pronouns === o.v ? null : o.v })}>
            {o.label}
          </Chip>
        ))}
      </div>

      {/* Focus areas */}
      <p className="text-slate-400 text-xs mb-2">What&apos;s on your heart</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {FOCUS_OPTS.map(o => {
          const has = draft.focus_areas.includes(o.v)
          return (
            <Chip key={o.v} active={has}
              onClick={() => void save({ ...draft, focus_areas: has ? draft.focus_areas.filter(x => x !== o.v) : [...draft.focus_areas, o.v] })}>
              {o.label}
            </Chip>
          )
        })}
      </div>

      {/* Relationship status (multi-select) */}
      <p className="text-slate-400 text-xs mb-2">Relationship</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {RELATIONSHIP_OPTS.map(o => (
          <Chip key={o.v} active={draft.relationship_status.includes(o.v)}
            onClick={() => void save({ ...draft, relationship_status: toggleMulti(draft.relationship_status, o.v) })}>
            {o.label}
          </Chip>
        ))}
      </div>

      {/* Work (multi-select) */}
      <p className="text-slate-400 text-xs mb-2">Work</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {JOB_OPTS.map(o => (
          <Chip key={o.v} active={draft.job_status.includes(o.v)}
            onClick={() => void save({ ...draft, job_status: toggleMulti(draft.job_status, o.v) })}>
            {o.label}
          </Chip>
        ))}
      </div>

      {/* Kids (multi-select) */}
      <p className="text-slate-400 text-xs mb-2">Children</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {KIDS_OPTS.map(o => (
          <Chip key={o.v} active={draft.kids.includes(o.v)}
            onClick={() => void save({ ...draft, kids: toggleMulti(draft.kids, o.v) })}>
            {o.label}
          </Chip>
        ))}
      </div>

      {savedTick && <p className="text-emerald-400 text-xs mb-3">Saved ✓</p>}

      {/* Re-run the conversational intake */}
      {flowOpen ? (
        <TellStellaFlow onComplete={() => setFlowOpen(false)} />
      ) : (
        <button onClick={() => setFlowOpen(true)}
          className="w-full rounded-xl px-4 py-2.5 text-sm bg-gradient-to-r from-stardust-400/20 to-stellar-300/20 border border-stardust-400/40 text-stardust-200 hover:border-stardust-400/70 transition-colors">
          ✨ Tell Stella about yourself
        </button>
      )}

      {/* What Stella knows about you — declared facts recap + free-text notes */}
      {(birthday || known.length > 0 || (personalized && memories.length > 0)) && (
        <div className="mt-4 border-t border-cosmos-800 pt-4">
          <p className="text-slate-400 text-xs mb-2">What Stella knows about you</p>
          {birthday && (
            <p className="text-slate-400 text-xs mb-2">
              🎂 Born {birthday} <span className="text-slate-600">· used for your birth chart</span>
            </p>
          )}
          {known.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {known.map((k, i) => (
                <span key={i} className="rounded-full px-3 py-1 text-xs bg-cosmos-950 border border-cosmos-800 text-slate-300">
                  {k}
                </span>
              ))}
            </div>
          )}
          {personalized && (
            memories.length > 0
              ? <MemoryList memories={memories} onChanged={refreshPersonalization} />
              : <p className="text-slate-600 text-xs mt-1">No saved notes yet — use “Tell Stella about yourself” to add some.</p>
          )}
          <p className="text-slate-600 text-[10px] mt-2">Edit the chips above to change what she knows.</p>
        </div>
      )}
    </div>
  )
}

function MemoryList({ memories, onChanged }: { memories: StellaMemory[]; onChanged: () => Promise<void> }) {
  const { user } = useUser()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  async function saveEdit(id: string) {
    try { await updateMemory(id, editText); await onChanged() } catch { /* ignore */ }
    setEditingId(null)
  }
  async function remove(id: string) {
    try { await deleteMemory(id); await onChanged() } catch { /* ignore */ }
  }
  async function clearAll() {
    if (!user) return
    try { await clearMemories(user.id); await onChanged() } catch { /* ignore */ }
  }

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-500 text-[11px] uppercase tracking-wider">Notes you&apos;ve shared</p>
        <button onClick={() => void clearAll()} className="text-rose-400/80 text-xs hover:text-rose-300">Clear all</button>
      </div>
      <ul className="flex flex-col gap-2">
        {memories.map(m => (
          <li key={m.id} className="bg-cosmos-950 border border-cosmos-800 rounded-xl px-3 py-2">
            {editingId === m.id ? (
              <div className="flex flex-col gap-2">
                <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} maxLength={500}
                  className="w-full bg-cosmos-900 border border-cosmos-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 outline-none resize-none" />
                <div className="flex gap-3 text-xs">
                  <button onClick={() => void saveEdit(m.id)} className="text-stardust-300">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-slate-500">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <p className="text-slate-300 text-sm leading-snug">{m.note}</p>
                <div className="flex gap-2 text-xs shrink-0">
                  <button onClick={() => { setEditingId(m.id); setEditText(m.note) }} className="text-slate-500 hover:text-slate-300">Edit</button>
                  <button onClick={() => void remove(m.id)} className="text-slate-600 hover:text-rose-300">✕</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={[
      'rounded-full px-3.5 py-1.5 text-sm border transition-colors',
      active ? 'bg-stardust-400/20 border-stardust-400/60 text-stardust-200' : 'border-cosmos-700 text-slate-400 hover:border-stardust-400/40',
    ].join(' ')}>
      {children}
    </button>
  )
}
