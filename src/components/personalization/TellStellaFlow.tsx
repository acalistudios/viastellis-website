/**
 * TellStellaFlow — the optional "Tell Stella about yourself" scripted intake.
 *
 * A warm, one-question-at-a-time conversation with Stella that populates the
 * personalization profile. Every step is skippable; answers are saved as the
 * user advances (partial completion still persists). The free-text memory step
 * only appears in `personalized` mode and gets an optional AI polish.
 *
 * Reusable in onboarding and in Settings (re-run any time to stay relevant).
 */
import { useState } from 'react'
import { useUser } from '@/store/UserContext'
import {
  addMemory,
  distillIntake,
  savePersonalization,
} from '@/lib/personalizationApi'
import type { FocusArea, PersonalizationMode, Pronouns, UserPersonalization } from '@/types'

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

type Step = 'mode' | 'pronouns' | 'focus' | 'memory' | 'done'

export function TellStellaFlow({ onComplete }: { onComplete?: () => void }) {
  const { user, session, profile, personalization, refreshPersonalization } = useUser()
  const name = profile?.display_name?.trim() || 'friend'

  const [draft, setDraft] = useState<UserPersonalization>(personalization)
  const [step, setStep] = useState<Step>('mode')
  const [memoryText, setMemoryText] = useState('')
  const [busy, setBusy] = useState(false)
  const [reply, setReply] = useState('')

  async function persist(next: UserPersonalization) {
    setDraft(next)
    if (!user) return
    try {
      await savePersonalization(user.id, next)
    } catch {
      /* fail soft — the migration may not have been run yet */
    }
  }

  // Advance to the next step, skipping the memory step in chart_only mode.
  function advanceFrom(current: Step, mode: PersonalizationMode) {
    const order: Step[] = mode === 'personalized'
      ? ['mode', 'pronouns', 'focus', 'memory', 'done']
      : ['mode', 'pronouns', 'focus', 'done']
    const i = order.indexOf(current)
    setStep(order[Math.min(i + 1, order.length - 1)])
  }

  async function finish() {
    await refreshPersonalization()
    onComplete?.()
  }

  async function submitMemory() {
    const text = memoryText.trim()
    if (!user || !session || !text) { advanceFrom('memory', draft.personalization_mode); return }
    setBusy(true)
    try {
      const { memory, reply } = await distillIntake(text, profile?.display_name ?? undefined, session.access_token)
      await addMemory(user.id, memory, 'intake')
      setReply(reply)
    } catch {
      /* fail soft */
    } finally {
      setBusy(false)
      setStep('done')
    }
  }

  const toggleFocus = (f: FocusArea) => {
    const has = draft.focus_areas.includes(f)
    void persist({ ...draft, focus_areas: has ? draft.focus_areas.filter(x => x !== f) : [...draft.focus_areas, f] })
  }

  return (
    <div className="bg-cosmos-900 border border-stardust-400/25 rounded-2xl p-5 text-left">
      {/* Stella header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">✨</span>
        <p className="text-sm font-display text-stardust-300">Stella</p>
      </div>

      {step === 'mode' && (
        <Bubble>
          <p>Hi {name}. Would you like me to <strong className="text-stardust-200">remember our conversations</strong> and
            tailor readings to you over time — or keep things to just your chart?</p>
          <p className="text-slate-500 text-xs mt-2">You can change this anytime, and I only ever keep what you share.</p>
          <div className="flex flex-col gap-2 mt-3">
            <Choice onClick={() => { void persist({ ...draft, personalization_mode: 'personalized' }); advanceFrom('mode', 'personalized') }}>
              Personalize my readings — remember me
            </Choice>
            <Choice subtle onClick={() => { void persist({ ...draft, personalization_mode: 'chart_only' }); advanceFrom('mode', 'chart_only') }}>
              Just my chart, thanks
            </Choice>
          </div>
        </Bubble>
      )}

      {step === 'pronouns' && (
        <Bubble>
          <p>Which pronouns should I use for you?</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {PRONOUN_OPTS.map(o => (
              <Chip key={o.v} active={draft.pronouns === o.v}
                onClick={() => void persist({ ...draft, pronouns: o.v })}>
                {o.label}
              </Chip>
            ))}
          </div>
          <NextRow onSkip={() => advanceFrom('pronouns', draft.personalization_mode)}
            onNext={() => advanceFrom('pronouns', draft.personalization_mode)} />
        </Bubble>
      )}

      {step === 'focus' && (
        <Bubble>
          <p>What&apos;s on your heart these days? Pick any that fit.</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {FOCUS_OPTS.map(o => (
              <Chip key={o.v} active={draft.focus_areas.includes(o.v)} onClick={() => toggleFocus(o.v)}>
                {o.label}
              </Chip>
            ))}
          </div>
          <NextRow onSkip={() => advanceFrom('focus', draft.personalization_mode)}
            onNext={() => advanceFrom('focus', draft.personalization_mode)} />
        </Bubble>
      )}

      {step === 'memory' && (
        <Bubble>
          <p>Anything you&apos;d like me to keep in mind about what you&apos;re going through right now?</p>
          <textarea
            value={memoryText}
            onChange={e => setMemoryText(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Totally optional — e.g. starting a new job, going through a breakup, focusing on my health…"
            className="w-full mt-3 bg-cosmos-950 border border-cosmos-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-stardust-400/50 outline-none resize-none"
          />
          <NextRow
            nextLabel={busy ? 'Saving…' : memoryText.trim() ? 'Share with Stella' : 'Skip'}
            disabled={busy}
            onSkip={() => setStep('done')}
            onNext={() => void submitMemory()}
            hideSkip={!!memoryText.trim()}
          />
        </Bubble>
      )}

      {step === 'done' && (
        <Bubble>
          {reply
            ? <p>{reply}</p>
            : <p>Thank you, {name}. I&apos;ll weave what you&apos;ve shared into your readings. ✨</p>}
          <button
            onClick={() => void finish()}
            className="mt-4 rounded-full px-5 py-2 bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-semibold"
          >
            Done
          </button>
        </Bubble>
      )}
    </div>
  )
}

// ── Small presentational helpers ─────────────────────────────────────────────

function Bubble({ children }: { children: React.ReactNode }) {
  return <div className="text-slate-200 text-sm leading-relaxed space-y-1">{children}</div>
}

function Choice({ children, onClick, subtle }: { children: React.ReactNode; onClick: () => void; subtle?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={subtle
        ? 'text-left rounded-xl px-4 py-2.5 text-sm border border-cosmos-700 text-slate-300 hover:border-stardust-400/40 transition-colors'
        : 'text-left rounded-xl px-4 py-2.5 text-sm bg-gradient-to-r from-stardust-400/20 to-stellar-300/20 border border-stardust-400/40 text-stardust-200 hover:border-stardust-400/70 transition-colors'}
    >
      {children}
    </button>
  )
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-full px-3.5 py-1.5 text-sm border transition-colors',
        active
          ? 'bg-stardust-400/20 border-stardust-400/60 text-stardust-200'
          : 'border-cosmos-700 text-slate-400 hover:border-stardust-400/40',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function NextRow({ onNext, onSkip, nextLabel = 'Next', disabled, hideSkip }: {
  onNext: () => void; onSkip: () => void; nextLabel?: string; disabled?: boolean; hideSkip?: boolean
}) {
  return (
    <div className="flex items-center gap-3 mt-4">
      <button
        onClick={onNext}
        disabled={disabled}
        className="rounded-full px-5 py-2 bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-semibold disabled:opacity-60"
      >
        {nextLabel}
      </button>
      {!hideSkip && (
        <button onClick={onSkip} disabled={disabled} className="text-slate-500 text-xs hover:text-slate-300">
          Skip
        </button>
      )}
    </div>
  )
}
