/**
 * ResetPasswordPage — sets a new password.
 *
 * Reached two ways:
 *  1. Via the recovery link in a "Forgot password?" email — Supabase signs the
 *     user in with a temporary recovery session, then redirects here.
 *  2. From Settings ("Change password") while normally signed in.
 *
 * Either way a session must exist; without one we point back to /auth.
 */

import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/store/UserContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { session, loading } = useUser()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => navigate('/', { replace: true }), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update password.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cosmos-950 flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-2 border-stardust-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cosmos-950 flex flex-col items-center justify-center px-6 py-12">
      <div className="mb-10 text-center">
        <Link to="/" aria-label="ViaStellis home" className="inline-block group">
          <img src="/logo.svg" alt="ViaStellis" className="w-14 h-14 mx-auto mb-3 group-hover:scale-105 transition-transform" />
          <h1 className="font-display text-4xl text-stardust-300 tracking-wide">ViaStellis</h1>
        </Link>
        <p className="text-slate-500 mt-1 text-sm">Set a new password</p>
      </div>

      <div className="w-full max-w-sm bg-cosmos-900 border border-cosmos-700 rounded-2xl p-8 shadow-2xl">
        {!session ? (
          <div className="text-center">
            <p className="text-slate-300 text-sm mb-4">
              This reset link is invalid or has expired.
            </p>
            <Link to="/auth" className="text-stardust-400 hover:text-stardust-300 text-sm underline underline-offset-2">
              Back to sign in
            </Link>
          </div>
        ) : done ? (
          <div className="text-center">
            <p className="text-3xl mb-3">✨</p>
            <p className="text-emerald-400 text-sm">
              Password updated! Taking you home…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="New password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              hint="At least 6 characters"
              autoComplete="new-password"
            />
            <Input
              label="Confirm new password"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />

            {error && (
              <p className="text-rose-400 text-sm bg-rose-400/10 border border-rose-400/20 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" isLoading={saving} className="mt-1">
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
