/**
 * create-checkout-session — Supabase Edge Function
 *
 * Creates a Stripe Checkout Session for either a subscription or a one-time
 * credit pack, and returns the hosted Checkout URL. The client never sees the
 * Stripe secret key; credit fulfillment happens later in stripe-webhook.
 *
 * Request body: { priceId: string, mode: 'subscription' | 'payment' }
 *   - priceId: a Stripe Price ID (created by scripts/setup-stripe-products.mjs).
 *              Each Price carries metadata.credits, read at fulfillment time —
 *              so this function stays price-agnostic.
 *
 * Required secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Optional: SITE_URL (falls back to the request Origin) for success/cancel URLs.
 */

import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { APP_TAG, isExplicitlyForeign } from '../_shared/stripeApp.ts'
import { priceScope, taggedPriceMetadata } from '../_shared/stripePrice.ts'

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Resolve and authorize a browser-supplied Price ID server-side.
 *
 * The client sends a priceId, which we must never take on trust — and since the
 * Stripe account is shared with Shattered Saga, an unvalidated id could name
 * ANOTHER product's price (or an inactive/mispriced one) and still transact.
 *
 * A price is accepted only if it is active, its type matches the requested mode,
 * and it is recognisably ours: tagged metadata.app = 'viastellis', or — for
 * prices created before app tagging — carrying metadata.credits, which every
 * ViaStellis price has and Shattered Saga's do not. Once
 * scripts/backfill-stripe-app-metadata.mjs has tagged the existing prices, the
 * legacy branch can be dropped.
 */
async function resolvePrice(
  stripe: Stripe,
  priceId: string,
  mode: 'subscription' | 'payment',
): Promise<{ ok: true; price: Stripe.Price } | { ok: false; reason: string }> {
  let price: Stripe.Price
  try {
    price = await stripe.prices.retrieve(priceId)
  } catch {
    return { ok: false, reason: 'unknown price' }
  }

  if (!price.active) return { ok: false, reason: 'inactive price' }

  const classification = priceScope(price.metadata as Record<string, string> | null)
  if (classification === 'foreign') {
    return { ok: false, reason: `price is not a ${APP_TAG} price` }
  }

  // Migration-safe strictness: credits metadata is the historical ViaStellis
  // fingerprint. Promote that known legacy price to an explicit app tag before
  // creating a session; unidentified untagged prices are still rejected.
  if (classification === 'legacy-ours') {
    price = await stripe.prices.update(price.id, {
      metadata: taggedPriceMetadata(price.metadata as Record<string, string> | null),
    })
  }

  const wantRecurring = mode === 'subscription'
  if (wantRecurring !== (price.type === 'recurring')) {
    return { ok: false, reason: `price type ${price.type} does not match mode ${mode}` }
  }

  return { ok: true, price }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { priceId, mode } = (await req.json()) as {
      priceId?: string
      mode?: 'subscription' | 'payment'
    }

    if (!priceId || (mode !== 'subscription' && mode !== 'payment')) {
      return json({ error: 'priceId and a valid mode are required' }, 400)
    }

    // ── Authenticate the user ──────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return json({ error: 'Invalid token' }, 401)

    // ── Reuse an existing Stripe customer if we have one ───────
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id ?? undefined
    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId)
      if (!customer.deleted && customer.metadata?.app && customer.metadata.app !== APP_TAG) {
        throw new Error('Stored Stripe customer belongs to another application')
      }
      if (!customer.deleted && customer.metadata?.app !== APP_TAG) {
        await stripe.customers.update(customerId, {
          metadata: { ...customer.metadata, app: APP_TAG, user_id: user.id },
        })
      }
    } else {
      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email,
        metadata: { app: APP_TAG, user_id: user.id },
      })
      customerId = customer.id
      const { error: customerStoreError } = await supabase
        .from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
      if (customerStoreError) throw customerStoreError
    }

    // ── Validate the browser-supplied price BEFORE creating a session ──
    const resolved = await resolvePrice(stripe, priceId, mode)
    if (!resolved.ok) {
      console.warn(`create-checkout-session rejected price ${priceId}: ${resolved.reason}`)
      return json({ error: 'That plan isn’t available. Please refresh and try again.' }, 400)
    }

    // ── Trial-abuse guard: one free trial per customer, ever ─────
    // If this Stripe customer has any prior ViaStellis subscription (active or
    // canceled), omit the trial so they go straight to paid.
    //
    // Scoped to OUR subscriptions: the shared Stripe account means this customer
    // may also hold a Shattered Saga subscription, and counting that one would
    // wrongly deny a first-time ViaStellis subscriber their free trial.
    let hadPriorSubscription = false
    if (customerId && mode === 'subscription') {
      const [activeSubs, canceledSubs] = await Promise.all([
        stripe.subscriptions.list({ customer: customerId, limit: 100 }),
        stripe.subscriptions.list({ customer: customerId, limit: 100, status: 'canceled' }),
      ])
      hadPriorSubscription = [...activeSubs.data, ...canceledSubs.data].some(
        // This customer id is stored on a ViaStellis profile and customers are
        // now app-scoped. Count legacy untagged subscriptions as prior use, but
        // never count an explicitly foreign object.
        (s) => !isExplicitlyForeign(s.metadata as Record<string, string> | null),
      )
    }

    // ── Where to send the user after checkout ──────────────────
    const origin = Deno.env.get('SITE_URL') ?? req.headers.get('Origin') ?? 'https://viastellis.com'

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      // Link the session back to our user for fulfillment in the webhook.
      // metadata.app scopes the event to ViaStellis on a Stripe account shared
      // with other ACALI products — see _shared/stripeApp.ts. It must ALSO go on
      // subscription_data, because subscription lifecycle events
      // (customer.subscription.updated/deleted) do not carry the session's metadata.
      client_reference_id: user.id,
      metadata: { app: APP_TAG, user_id: user.id },
      ...(mode === 'subscription'
        ? {
            subscription_data: {
              ...(!hadPriorSubscription && { trial_period_days: 7 }),
              metadata: { app: APP_TAG, user_id: user.id },
            },
          }
        : { payment_intent_data: { metadata: { app: APP_TAG, user_id: user.id } } }),
      customer: customerId,
      success_url: `${origin}/home?checkout=success`,
      cancel_url: `${origin}/upgrade?checkout=cancelled`,
      allow_promotion_codes: true,
    })

    return json({ url: session.url })
  } catch (err) {
    console.error('create-checkout-session error:', err)
    return json({ error: 'Could not start checkout. Please try again.' }, 500)
  }
})
