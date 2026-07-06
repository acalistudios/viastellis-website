import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/store/UserContext'
import { Button } from '@/components/ui/Button'
import { PersonalizationSettings } from '@/components/personalization/PersonalizationSettings'

const CHART_SYSTEM_OPTIONS = [
  { value: 'vedic', label: '🪔 Vedic (sidereal)', hint: 'Recommended · star-aligned zodiac, nakshatras, dashas · daily reading by Moon sign' },
  { value: 'western', label: '♈ Western (tropical)', hint: 'Familiar sun-sign zodiac, Placidus houses, aspects · daily reading by Sun sign' },
] as const

// One source of truth: the chosen system sets the default daily-horoscope lens.
// Vedic → Moon sign (rashi, the traditional Vedic daily reading); Western → Sun sign.
function defaultLensFor(system: 'vedic' | 'western'): 'vedic_moon' | 'western_sun' {
  return system === 'western' ? 'western_sun' : 'vedic_moon'
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, profile } = useUser()
  const [signingOut, setSigningOut] = useState(false)
  const [chartSystem, setChartSystem] = useState(profile?.chart_system ?? 'vedic')
  const [chartSaved, setChartSaved] = useState(false)
  const [persona, setPersona] = useState<'warm' | 'stoic' | 'sassy'>(profile?.stella_persona ?? 'warm')
  const [personaSaved, setPersonaSaved] = useState(false)

  async function handlePersonaChange(value: 'warm' | 'stoic' | 'sassy') {
    setPersona(value)
    setPersonaSaved(false)
    if (!user) return
    const { error } = await supabase.from('profiles').update({ stella_persona: value }).eq('id', user.id)
    if (!error) setPersonaSaved(true)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/auth', { replace: true })
  }

  async function handleChartSystemChange(value: typeof chartSystem) {
    setChartSystem(value)
    setChartSaved(false)
    if (!user) return
    // The system choice drives both the chart and the default daily-horoscope lens.
    const { error } = await supabase
      .from('profiles')
      .update({ chart_system: value, default_horoscope_lens: defaultLensFor(value) })
      .eq('id', user.id)
    if (!error) setChartSaved(true)
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

      {/* Astrology system — drives both the chart and the daily horoscope */}
      <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl px-5 py-4 mb-6">
        <p className="text-slate-300 text-sm font-medium mb-1">Astrology system</p>
        <p className="text-slate-500 text-xs mb-3">
          This sets both your birth chart and your free daily horoscope. We recommend Vedic; prefer
          the familiar tropical zodiac? Switch to Western for a full chart with Placidus houses and
          aspects.{' '}
          <Link to="/zodiac-systems" className="text-stardust-400 hover:underline">Learn the difference →</Link>
        </p>
        <div className="flex flex-col gap-2">
          {CHART_SYSTEM_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={[
                'flex items-start gap-3 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors text-sm',
                chartSystem === opt.value
                  ? 'border-stardust-400/50 bg-stardust-400/10 text-stardust-200'
                  : 'border-cosmos-700 text-slate-300 hover:border-cosmos-600',
              ].join(' ')}
            >
              <input
                type="radio"
                name="chartSystem"
                value={opt.value}
                checked={chartSystem === opt.value}
                onChange={() => void handleChartSystemChange(opt.value)}
                className="accent-stardust-400 mt-0.5"
              />
              <span>
                <span className="block">{opt.label}</span>
                <span className="block text-slate-500 text-xs mt-0.5">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {chartSaved && <p className="text-emerald-400 text-xs mt-2">Saved ✓</p>}
        <p className="text-slate-500 text-xs mt-3">
          Want a different daily reading now and then? You can switch lenses (including Love, Career
          & Money) right on the Home screen anytime.
        </p>
      </div>

      {/* Stella's personality — moved here from the chat page */}
      <div className="bg-cosmos-900 border border-cosmos-700 rounded-2xl px-5 py-4 mb-6">
        <p className="text-slate-300 text-sm font-medium mb-1">Stella&apos;s personality</p>
        <p className="text-slate-500 text-xs mb-3">How Stella speaks with you across chat and readings.</p>
        <div className="flex flex-col gap-2">
          {([
            ['warm', '🌸 Warm', 'Supportive & encouraging'],
            ['stoic', '🪐 Stoic', 'Calm ancient wisdom'],
            ['sassy', '⚡ Sassy', 'Bold & witty'],
          ] as const).map(([value, label, hint]) => (
            <label key={value} className={[
              'flex items-start gap-3 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors text-sm',
              persona === value
                ? 'border-stardust-400/50 bg-stardust-400/10 text-stardust-200'
                : 'border-cosmos-700 text-slate-300 hover:border-cosmos-600',
            ].join(' ')}>
              <input type="radio" name="persona" value={value} checked={persona === value}
                onChange={() => void handlePersonaChange(value)} className="accent-stardust-400 mt-0.5" />
              <span>
                <span className="block">{label}</span>
                <span className="block text-slate-500 text-xs mt-0.5">{hint}</span>
              </span>
            </label>
          ))}
        </div>
        {personaSaved && <p className="text-emerald-400 text-xs mt-2">Saved ✓</p>}
      </div>

      {/* Personalization — mode, pronouns, focus, memories, and the intake flow */}
      <PersonalizationSettings />

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
        <Link to="/terms" className="hover:text-stardust-400">Terms</Link>
        <span>·</span>
        <Link to="/privacy" className="hover:text-stardust-400">Privacy</Link>
        <span>·</span>
        <Link to="/refund" className="hover:text-stardust-400">Refunds</Link>
        <span>·</span>
        <Link to="/contact" className="hover:text-stardust-400">Contact</Link>
      </div>
      <p className="text-xs text-slate-600 text-center mt-3">
        ViaStellis · v0.1.0
      </p>
    </div>
  )
}
