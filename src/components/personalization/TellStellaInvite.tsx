/**
 * TellStellaInvite — a gentle, dismissible Home card inviting new users into the
 * optional "Tell Stella about yourself" flow. Hidden once the user has engaged
 * (set pronouns/focus/memories or chosen a mode) or dismissed it.
 */
import { useState } from 'react'
import { useUser } from '@/store/UserContext'
import { TellStellaFlow } from './TellStellaFlow'

const DISMISS_KEY = 'viastellis-intake-dismissed'

export function TellStellaInvite() {
  const { personalization, memories } = useUser()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === 'true' } catch { return false }
  })

  const hasEngaged =
    personalization.personalization_mode === 'personalized' ||
    personalization.pronouns !== null ||
    personalization.focus_areas.length > 0 ||
    memories.length > 0

  if (dismissed || hasEngaged) return null

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, 'true') } catch { /* ignore */ }
    setDismissed(true)
  }

  if (open) {
    return (
      <div className="w-full mb-3">
        <TellStellaFlow onComplete={dismiss} />
      </div>
    )
  }

  return (
    <div className="w-full bg-gradient-to-br from-stardust-400/10 to-stellar-300/10 border border-stardust-400/30 rounded-2xl px-5 py-4 mb-3 text-left flex items-start gap-3">
      <span className="text-lg leading-none mt-0.5">✨</span>
      <div className="flex-1">
        <p className="text-stardust-200 text-sm font-medium">Tell Stella about yourself</p>
        <p className="text-slate-400 text-xs mt-0.5">
          A quick, optional chat so your readings feel truly yours. Skip anything you like.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="mt-3 rounded-full px-4 py-1.5 bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-xs font-semibold"
        >
          Start
        </button>
      </div>
      <button onClick={dismiss} aria-label="Dismiss" className="text-slate-500 hover:text-slate-300 text-sm">✕</button>
    </div>
  )
}
