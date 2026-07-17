/**
 * UnsubscribePage — public route: /unsubscribe?token=<uuid>
 *
 * Reached from the "Unsubscribe" link in the daily email. Deliberately works
 * WITHOUT a login: the token IS the credential, and the RPC is granted to anon.
 * Anything that makes opting out harder than opting in is both bad manners and
 * (for commercial mail) legally dicey — so this is one click, no account, no
 * "are you sure" gauntlet.
 *
 * The email's List-Unsubscribe header already hit the `unsubscribe` edge
 * function (which redirects here with done=1), so by the time a human lands
 * here it's usually already done. We still call the RPC to be certain — it's
 * idempotent.
 */

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type State = 'working' | 'done' | 'bad-token'

export function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [state, setState] = useState<State>('working')

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!token) { setState('bad-token'); return }
      const { data, error } = await supabase.rpc('unsubscribe_daily_email', { p_token: token })
      if (cancelled) return
      // The RPC returns false for an unknown token.
      setState(error || data === false ? 'bad-token' : 'done')
    }
    void run()
    return () => { cancelled = true }
  }, [token])

  return (
    <div className="min-h-screen bg-cosmos-950 text-slate-200 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <p className="font-display text-3xl text-stardust-300">ViaStellis</p>
        <p className="text-slate-500 text-xs mb-8">Wisdom from the stars</p>

        {state === 'working' && (
          <span className="inline-block w-7 h-7 rounded-full border-2 border-stardust-400 border-t-transparent animate-spin" />
        )}

        {state === 'done' && (
          <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl px-6 py-7">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-slate-100 font-display text-xl mb-2">You're unsubscribed</p>
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              You won't get the daily horoscope email again. No hard feelings — your chart,
              readings and free daily tarot card are all still waiting whenever you want them.
            </p>
            <p className="text-slate-500 text-xs">
              Changed your mind? You can turn it back on any time in{' '}
              <Link to="/settings" className="text-stardust-400 underline">Settings</Link>.
            </p>
          </div>
        )}

        {state === 'bad-token' && (
          <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl px-6 py-7">
            <p className="text-2xl mb-2">🤔</p>
            <p className="text-slate-100 font-display text-xl mb-2">This link didn't work</p>
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              The unsubscribe link looks incomplete or is no longer valid. You can turn the
              daily email off yourself in Settings, or email{' '}
              <a href="mailto:support@viastellis.com" className="text-stardust-400 underline">
                support@viastellis.com
              </a>{' '}
              and we'll take care of it.
            </p>
            <Link
              to="/settings"
              className="inline-block rounded-full bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-medium px-5 py-2"
            >
              Go to Settings
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
