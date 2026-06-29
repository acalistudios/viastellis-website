/**
 * Billing client — starts a Stripe Checkout flow via the create-checkout-session
 * Edge Function and redirects the browser to Stripe's hosted page.
 */

import { supabase } from './supabase'

const PROXY_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '/api'

/**
 * Begin checkout for a given Stripe Price.
 * Redirects to Stripe on success; throws with a user-friendly message otherwise.
 */
export async function startCheckout(priceId: string, mode: 'subscription' | 'payment'): Promise<void> {
  if (!priceId) {
    throw new Error('This plan isn’t configured yet. Please try again later.')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Please sign in to continue.')
  }

  const res = await fetch(`${PROXY_BASE}/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ priceId, mode }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Could not start checkout. Please try again.')
  }

  const { url } = (await res.json()) as { url?: string }
  if (!url) throw new Error('Could not start checkout. Please try again.')

  window.location.href = url
}

/**
 * Cancel the current user's subscription at period end.
 * The user keeps Premium access until the billing cycle ends.
 */
export async function cancelSubscription(): Promise<{ cancel_at: string | null }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Please sign in to continue.')

  const res = await fetch(`${PROXY_BASE}/cancel-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({}),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Could not cancel subscription. Please try again.')
  }

  return res.json() as Promise<{ cancel_at: string | null }>
}
