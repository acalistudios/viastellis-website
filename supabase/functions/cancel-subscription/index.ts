/**
 * cancel-subscription — Supabase Edge Function
 *
 * Cancels the user's active Stripe subscription at the end of the current
 * billing period. The user keeps Premium access until then; the webhook
 * (customer.subscription.deleted) downgrades them automatically when it expires.
 *
 * Request:  {} (empty — user is identified via JWT)
 * Response: { ok: true, cancel_at: ISO-string } | { error: string }
 *
 * Required secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { scopeOf } from '../_shared/stripeApp.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-02-24.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return json({ error: 'Invalid token' }, 401)

  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status')
    .eq('id', user.id)
    .single()

  if (profile?.subscription_tier !== 'premium') return json({ error: 'You don’t have an active subscription.' }, 400)
  const NO_SUB = 'We couldn’t find an active subscription to cancel. If your Premium was granted manually or you subscribed a while ago, email support@viastellis.com and we’ll sort it out.'
  if (!profile?.stripe_customer_id) return json({ error: NO_SUB }, 404)

  try {
    // Preferred path: cancel the exact subscription we recorded at checkout.
    // The Stripe account is shared with other ACALI products, so "the customer's
    // first active subscription" is NOT necessarily the ViaStellis one — picking
    // by customer alone could cancel someone's Shattered Saga plan instead.
    let sub: Stripe.Subscription | undefined
    if (profile.stripe_subscription_id) {
      const known = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
      if (known && known.status !== 'canceled') sub = known
    }

    // Legacy fallback: subscriptions created before we stored the id. Scan the
    // customer's subscriptions but skip any explicitly owned by another product.
    if (!sub) {
      const [active, trialing] = await Promise.all([
        stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'active', limit: 100 }),
        stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'trialing', limit: 100 }),
      ])
      sub = [...active.data, ...trialing.data].find(
        (s) => scopeOf(s.metadata as Record<string, string> | null) !== 'foreign',
      )
      if (sub) {
        console.warn(`cancel-subscription: legacy customer-scan matched ${sub.id} for user ${user.id}`)
      }
    }

    if (!sub) return json({ error: NO_SUB }, 404)

    // Cancel at period end — user keeps access until the billing cycle ends.
    const updated = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true })
    const item0 = updated.items.data[0] as (typeof updated.items.data[0] & { current_period_end?: number }) | undefined
    const periodEndUnix = updated.current_period_end ?? item0?.current_period_end
    const cancelAt = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null

    return json({ ok: true, cancel_at: cancelAt })
  } catch (err) {
    // e.g. a stale/test-mode customer id under the live key ("No such customer"),
    // or any Stripe API failure — return a clean message instead of a 500.
    console.error('cancel-subscription Stripe error:', err)
    const msg = (err as { message?: string })?.message ?? ''
    if (/no such customer/i.test(msg)) return json({ error: NO_SUB }, 404)
    return json({ error: 'We couldn’t cancel your subscription right now. Please try again in a moment, or email support@viastellis.com.' }, 502)
  }
})
