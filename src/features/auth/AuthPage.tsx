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
          WISDOM FROM THE STARS
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

          {/* Google sign-in */}
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={async () => {
                  setError('')
                  await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: `${window.location.origin}/home` },
                  })
                }}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-stardust-400/20 bg-white/5 hover:bg-white/10 transition-all text-sm font-medium text-slate-200 hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              <button
                type="button"
                onClick={async () => {
                  setError('')
                  await supabase.auth.signInWithOAuth({
                    provider: 'facebook',
                    options: { redirectTo: `${window.location.origin}/home` },
                  })
                }}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-stardust-400/20 bg-white/5 hover:bg-white/10 transition-all text-sm font-medium text-slate-200 hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M18 9c0-4.97-4.03-9-9-9S0 4.03 0 9c0 4.49 3.29 8.21 7.59 8.89v-6.29H5.31V9h2.28V7.02c0-2.25 1.34-3.49 3.39-3.49.98 0 2.01.17 2.01.17v2.21h-1.13c-1.11 0-1.46.69-1.46 1.4V9h2.49l-.4 2.6h-2.09v6.29C14.71 17.21 18 13.49 18 9z" fill="#1877F2"/>
                </svg>
                Continue with Facebook
              </button>
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-stardust-400/10" />
                <span className="text-xs text-slate-600">or</span>
                <div className="flex-1 h-px bg-stardust-400/10" />
              </div>
            </>
          )}

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
