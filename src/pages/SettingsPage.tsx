import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/store/UserContext'
import { Button } from '@/components/ui/Button'

const LENS_OPTIONS = [
  { value: 'western_sun', label: '☀️ Sun sign (Western)' },
  { value: 'vedic_moon', label: '🌙 Moon sign (Vedic)' },
  { value: 'vedic_sun', label: '✶ Sun sign (Vedic)' },
] as const

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, profile } = useUser()
  const [signingOut, setSigningOut] = useState(false)
  const [lens, setLens] = useState(profile?.default_horoscope_lens ?? 'western_sun')
  const [lensSaved, setLensSaved] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/auth', { replace: true })
  }

  async function handleLensChange(value: typeof lens) {
    setLens(value)
    setLensSaved(false)
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ default_horoscope_lens: value })
      .eq('id', user.id)
    if (!error) setLensSaved(true)
  }

  return (
    <div className="px-6 py-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-display text-stardust-300 mb-6">Settings</h1>

      <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-cosmos-800">
          <span className="text-slate-500 text-sm">Email</span>
          <span className="text-slate-200 text-sm">{user?.email ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-cosmos-800">
          <span className="text-slate-500 text-sm">Plan</span>
          <span className="text-slate-200 text-sm capitalize">{profile?.subscription_tier ?? 'free'}</span>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="text-slate-500 text-sm">Credits remaining</span>
          <span className="text-stellar-300 text-sm font-medium">{profile?.credits_remaining ?? '—'}</span>
        </div>
      </div>

      {/* Free daily horoscope lens */}
      <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl px-5 py-4 mb-6">
        <p className="text-slate-300 text-sm font-medium mb-1">Free daily horoscope</p>
        <p className="text-slate-500 text-xs mb-3">
          Pick the lens you get free each day. Other lenses cost credits (free on Premium).
        </p>
        <div className="flex flex-col gap-2">
          {LENS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={[
                'flex items-center gap-3 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors text-sm',
                lens === opt.value
                  ? 'border-stardust-400/50 bg-stardust-400/10 text-stardust-200'
                  : 'border-cosmos-700 text-slate-300 hover:border-cosmos-600',
              ].join(' ')}
            >
              <input
                type="radio"
                name="lens"
                value={opt.value}
                checked={lens === opt.value}
                onChange={() => void handleLensChange(opt.value)}
                className="accent-stardust-400"
              />
              {opt.label}
            </label>
          ))}
        </div>
        {lensSaved && <p className="text-emerald-400 text-xs mt-2">Saved ✓</p>}
      </div>

      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={() => navigate('/upgrade')}>
          {profile?.subscription_tier === 'premium' ? 'Buy more credits' : 'Unlock Stella — Upgrade'}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => navigate('/settings/birth')}>
          Edit Birth Details
        </Button>
        <Button variant="secondary" size="lg" onClick={() => navigate('/reset-password')}>
          Change Password
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={handleSignOut}
          isLoading={signingOut}
          className="border-rose-400/50 text-rose-400 hover:bg-rose-400/10"
        >
          Sign Out
        </Button>
      </div>

      <div className="flex items-center justify-center gap-3 text-[11px] text-slate-600 mt-8">
        <a href="/terms" className="hover:text-stardust-400">Terms</a>
        <span>·</span>
        <a href="/privacy" className="hover:text-stardust-400">Privacy</a>
        <span>·</span>
        <a href="/refund" className="hover:text-stardust-400">Refunds</a>
        <span>·</span>
        <a href="/contact" className="hover:text-stardust-400">Contact</a>
      </div>
      <p className="text-xs text-slate-600 text-center mt-3">
        ViaStellis · v0.1.0
      </p>
    </div>
  )
}
