import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

// Must match CONFIRMATION in supabase/functions/delete-account/index.ts — the
// function rejects the request if the phrase does not arrive exactly.
export const DELETE_PHRASE = 'DELETE MY ACCOUNT'

/**
 * Permanent account deletion, as a self-contained panel.
 *
 * Extracted from SettingsPage so the same flow can be offered everywhere a
 * signed-in user might need it. That matters because Settings is NOT always
 * reachable: AuthGuard keys on whether the user has a primary chart, so a
 * signed-in user who abandons onboarding is bounced from /settings back to
 * /onboarding and previously had no in-app route to delete at all — only
 * emailing support and waiting up to 30 days.
 *
 * That state is not hypothetical and it is not empty: at that point the
 * account already holds an auth.users row and a profiles row. Both Apple
 * (App Review 5.1.1(v)) and Google require in-app deletion for any app
 * offering account creation.
 *
 * Deliberately two-step and typed-to-confirm: this erases every reading,
 * journal entry and Stella memory with no recovery path, so a single mis-tap
 * must not trigger it.
 */
export function DeleteAccountPanel({ className = '' }: { className?: string }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const { data, error: fnError } = await supabase.functions.invoke('delete-account', {
      body: { confirm: DELETE_PHRASE },
    })
    if (fnError || !(data as { success?: boolean } | null)?.success) {
      // The function deletes rows before the login, and aborts before removing
      // the login if anything fails — so on error the account still exists.
      setError(
        (data as { error?: string } | null)?.error ??
          fnError?.message ??
          'Could not delete your account. Please try again or contact support@viastellis.com.',
      )
      setDeleting(false)
      return
    }
    // The auth user is gone; clear the local session so nothing lingers.
    await supabase.auth.signOut()
    navigate('/?deleted=1', { replace: true })
  }

  return (
    <div className={`bg-cosmos-900 border border-rose-500/30 rounded-2xl px-5 py-4 ${className}`}>
      <p className="text-rose-400 text-sm font-medium mb-1">Delete account</p>
      <p className="text-slate-500 text-xs leading-relaxed mb-3">
        Permanently deletes your account and everything in it — birth details, saved
        charts, journal entries, Stella&rsquo;s memories, compatibility and decision
        reports. This cannot be undone, and any remaining credits are forfeited.
      </p>
      {/* Deleting the account does not touch the store subscription. Without this
          a user can delete their account and keep being billed, with no remaining
          way to see or cancel it from inside the app. Wording from Codex's 7358940,
          which covers all stores unconditionally rather than guessing the platform. */}
      <p className="text-amber-400/90 text-xs leading-relaxed mb-3">
        <strong>Account deletion does not cancel subscriptions.</strong> If you have
        any subscriptions, cancel each one before deleting your account to prevent
        further charges. Manage Google Play subscriptions in the Play Store under
        Payments &amp; subscriptions → Subscriptions. Manage Apple subscriptions in
        Settings → your name → Subscriptions. Manage website subscriptions by signing
        in at viastellis.com and opening Upgrade. Check each service you subscribed
        through.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-rose-400 text-sm underline underline-offset-4 hover:text-rose-300"
        >
          I want to delete my account
        </button>
      ) : (
        <div>
          <label htmlFor="delete-confirm" className="block text-slate-400 text-xs mb-2">
            Type <span className="text-rose-400 font-mono">{DELETE_PHRASE}</span> to confirm:
          </label>
          <input
            id="delete-confirm"
            type="text"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            className="w-full bg-cosmos-950 border border-cosmos-700 rounded-lg px-3 py-2 text-sm text-slate-200 mb-3 focus:outline-none focus:border-rose-500/60"
          />
          {error && <p className="text-rose-400 text-xs mb-3" role="alert">{error}</p>}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDelete}
              isLoading={deleting}
              disabled={typed !== DELETE_PHRASE || deleting}
              className="border-rose-400/50 text-rose-400 hover:bg-rose-400/10"
            >
              Delete permanently
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setOpen(false); setTyped(''); setError(null) }}
              disabled={deleting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
