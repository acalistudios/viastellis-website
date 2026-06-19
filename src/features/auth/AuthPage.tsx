import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Starfield } from '@/components/ui/Starfield'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Mode = 'signin' | 'signup' | 'forgot'

const STORAGE_KEY = 'viastellis_remembered_emails'

interface RememberedEmail {
  email: string
  timestamp: number
}

export function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberEmail, setRememberEmail] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [rememberedEmails, setRememberedEmails] = useState<RememberedEmail[]>([])

  // Load remembered emails on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed: RememberedEmail[] = JSON.parse(stored)
        // Keep only last 5, sorted by recency
        const recent = parsed.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)
        setRememberedEmails(recent)
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  function saveEmail(e: string) {
    if (!rememberEmail) return
    const stored = localStorage.getItem(STORAGE_KEY)
    let emails: RememberedEmail[] = stored ? JSON.parse(stored) : []
    // Remove if exists, then add to front
    emails = emails.filter(item => item.email !== e)
    emails.unshift({ email: e, timestamp: Date.now() })
    emails = emails.slice(0, 5) // Keep last 5
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emails))
    setRememberedEmails(emails)
  }

  function forgetEmail(e: string) {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return
    let emails: RememberedEmail[] = JSON.parse(stored)
    emails = emails.filter(item => item.email !== e)
    if (emails.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(emails))
    }
    setRememberedEmails(emails)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
        setMessage('Check your email for a password reset link.')
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (rememberEmail) saveEmail(email)
        setMessage('Check your email to confirm your account, then sign in.')
        setMode('signin')
        setPassword('')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (rememberEmail) saveEmail(email)
        // Redirect to /home; AuthGuard will route to /onboarding if no chart exists
        navigate('/home', { replace: true })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0817] via-[#1a1a3f] to-[#0a0e27] flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <Starfield count={120} />

      {/* Subtle constellation line decoration */}
      <div className="absolute top-20 right-10 w-40 h-40 border border-stardust-400/10 rounded-full" />
      <div className="absolute bottom-32 left-10 w-32 h-32 border border-stardust-400/5 rounded-full" />

      {/* Logo / wordmark — clicking returns to the home page */}
      <Link to="/" className="mb-12 text-center relative z-10 block group" aria-label="ViaStellis home">
        <img
          src="/logo.svg"
          alt="ViaStellis"
          className="w-16 h-16 mx-auto mb-4 drop-shadow-lg group-hover:scale-105 transition-transform"
        />
        <h1 className="font-display text-5xl text-stardust-300 tracking-wide drop-shadow-lg group-hover:text-stardust-200 transition-colors">
          ViaStellis
        </h1>
        <p className="text-slate-300 mt-2 text-sm font-light tracking-widest">
          YOUR PATH THROUGH THE STARS
        </p>
      </Link>

      <div className="w-full max-w-sm relative z-10">
        {/* Main auth card */}
        <div className="bg-gradient-to-br from-[#1a1a3f]/80 to-[#0f0817]/80 backdrop-blur-xl border border-stardust-400/20 rounded-3xl p-8 shadow-2xl">
          {/* Tab switcher */}
          <div className="flex bg-[#0a0e27]/60 rounded-xl p-1 mb-8 border border-stardust-400/10">
            {(['signup', 'signin'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setError('')
                  setMessage('')
                  setPassword('')
                }}
                className={[
                  'flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300',
                  mode === m
                    ? 'bg-gradient-to-r from-stardust-400 to-stellar-300 text-[#0a0e27] shadow-lg shadow-stardust-400/30'
                    : 'text-slate-400 hover:text-stardust-300',
                ].join(' ')}
              >
                {m === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Remembered emails quick-select */}
            {mode === 'signin' && rememberedEmails.length > 0 && (
              <div className="space-y-2 pb-4 border-b border-stardust-400/10">
                <p className="text-xs uppercase tracking-widest text-slate-500 px-1">
                  Recent accounts
                </p>
                <div className="space-y-2">
                  {rememberedEmails.map(item => (
                    <button
                      key={item.email}
                      type="button"
                      onClick={() => setEmail(item.email)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#0a0e27]/40 hover:bg-stardust-400/10 border border-stardust-400/10 hover:border-stardust-400/30 transition-all text-left"
                    >
                      <span className="text-sm text-slate-300">{item.email}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          forgetEmail(item.email)
                        }}
                        className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        ✕
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="bg-[#0a0e27]/60 border-stardust-400/20 focus:border-stardust-400/60"
            />

            {mode !== 'forgot' && (
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                hint={mode === 'signup' ? 'At least 6 characters' : undefined}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="bg-[#0a0e27]/60 border-stardust-400/20 focus:border-stardust-400/60"
              />
            )}

            {/* Remember email checkbox */}
            {mode !== 'forgot' && (
              <label className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-stardust-400/40 bg-[#0a0e27] accent-stardust-400 cursor-pointer"
                />
                <span>Remember this email</span>
              </label>
            )}

            {error && (
              <p className="text-rose-300 text-sm bg-rose-400/10 border border-rose-400/30 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            {message && (
              <div className="text-emerald-300 text-sm bg-emerald-400/10 border border-emerald-400/30 rounded-lg px-4 py-3">
                <p>{message}</p>
                <p className="text-emerald-200/70 text-xs mt-2 leading-relaxed">
                  Don’t see it? Check your spam or junk folder. To make sure future emails
                  reach your inbox, add <span className="font-medium">Stella@viastellis.com</span> to
                  your contacts.
                </p>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              isLoading={loading}
              className="mt-2 bg-gradient-to-r from-stardust-400 to-stellar-300 hover:from-stardust-300 hover:to-stellar-200 text-[#0a0e27] shadow-lg shadow-stardust-400/20"
            >
              {mode === 'signup'
                ? 'Create Account'
                : mode === 'forgot'
                ? 'Send Reset Link'
                : 'Sign In'}
            </Button>

            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => {
                  setMode('forgot')
                  setError('')
                  setMessage('')
                }}
                className="text-slate-500 hover:text-stardust-300 text-xs text-center transition-colors py-2"
              >
                Forgot your password?
              </button>
            )}

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  setError('')
                  setMessage('')
                }}
                className="text-slate-500 hover:text-stardust-300 text-xs text-center transition-colors py-2"
              >
                Back to sign in
              </button>
            )}
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-600 mt-8">
          All insights are for entertainment purposes only.
        </p>
      </div>
    </div>
  )
}
