/**
 * stripe-webhook — Supabase Edge Function
 *
 * The ONLY place credits are granted / subscriptions are set. Stripe calls this
 * after a payment; we verify the signature, then update the user's balance via
 * the trusted grant_credits() / set_subscription() SQL functions.
 *
 * Credit amounts are NOT hard-coded — each Stripe Price carries metadata.credits,
 * which we read here. So pricing lives entirely in Stripe + this metadata.
 *
 * ── APP SCOPING (shared Stripe account) ────────────────────────────────────
 * The ACALI Studios Stripe account is shared with Shattered Saga, and Stripe
 * delivers events ACCOUNT-WIDE. Three rules keep the products isolated:
 *
 *   1. Any event whose metadata.app names another product is recorded and
 *      ignored — we never write a row in response to it.
 *   2. Subscription lifecycle events match on the stored stripe_subscription_id,
 *      NEVER on stripe_customer_id alone. If one Stripe Customer ever covered a
 *      person across both products, customer-id matching would let a Shattered
 *      Saga cancellation silently downgrade their paid ViaStellis plan.
 *   3. A user id that isn't a UUID is treated as unmapped, not passed to
 *      Postgres — a foreign id would raise a uuid cast error, become a 500, and
 *      make Stripe retry that event forever.
 *
 * Unmapped events are an explicit no-op with a 200: never an error, never a guess.
 *
 * Idempotency: claim_stripe_event() dedupes on the Stripe event id for EVERY
 * event type (grant_credits also dedupes independently for credit grants).
 *
 * Required secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 *                   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 *
 * IMPORTANT: deploy with JWT verification OFF (Stripe can't send a Supabase JWT):
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 */

import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { APP_TAG, scopeOf, asUuid, isExplicitlyForeign, type AppScope } from '../_shared/stripeApp.ts'
import { creditsFromLineItems, subscriptionIdFromInvoice } from '../_shared/stripeWebhook.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-02-24.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const ok = () =>
  new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

/**
 * Read the subscription id off an Invoice, tolerating both API-version shapes.
 *
 * Our SDK is pinned to 2025-02-24.acacia, but the webhook ENDPOINT delivers in
 * whatever version it is configured for (currently 2026-05-27.dahlia) — those
 * are independent settings. In Basil and later, Stripe moved `invoice.subscription`
 * to `invoice.parent.subscription_details.subscription`.
 *
 * This matters more than it looks: if we can't find the subscription we can't
 * read its metadata.app, so under STRICT scoping the invoice would be treated as
 * foreign and IGNORED — silently skipping the credit grant on a real renewal.
 * Read both locations rather than depending on the endpoint's version setting.
 */
/** Resolve our user id from a Stripe SUBSCRIPTION id — the safe, product-scoped path. */
async function userIdForSubscription(subscriptionId: string): Promise<string | null> {
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle()
  return data?.id ?? null
}

/**
 * Resolve our user id from a Stripe customer id.
 *
 * LEGACY ONLY. Safe exclusively for events already established as ours (scope
 * 'ours' or, per the documented migration assumption, 'unknown'). Never call
 * this for a 'foreign' event — that is the silent-downgrade bug.
 */
async function userIdForCustomer(customerId: string | null): Promise<string | null> {
  if (!customerId) return null
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data?.id ?? null
}

/** Record an event we deliberately did not act on. Always answers 200. */
async function recordAndSkip(
  event: Stripe.Event,
  outcome: 'foreign' | 'unmapped',
  app: string | null,
  detail: string,
): Promise<Response> {
  console.log(`stripe-webhook ${event.type} ${event.id}: ${outcome} (${detail})`)
  await admin.rpc('claim_stripe_event', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_app: app,
    p_user_id: null,
    p_outcome: outcome,
  })
  return ok()
}

Deno.serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })

  let event: Stripe.Event
  try {
    const body = await req.text()
    // Async variant is required in Deno (SubtleCrypto is async).
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET)
  } catch (err) {
    console.error('Signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Resolved per event type below: which app owns it, and which of our users.
  let scope: AppScope = 'unknown'
  let appTag: string | null = null
  let userId: string | null = null
  let subscriptionId: string | null = null

  try {
    switch (event.type) {
      // ── First payment of a Checkout Session ──────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const meta = session.metadata as Record<string, string> | null
        scope = scopeOf(meta)
        appTag = meta?.app ?? null

        if (scope === 'foreign') {
          return await recordAndSkip(event, 'foreign', appTag, `session for ${appTag}`)
        }

        // asUuid: a Shattered Saga client_reference_id is not necessarily a UUID,
        // and handing one to a uuid-typed RPC would 500 → infinite Stripe retries.
        userId = asUuid(session.client_reference_id) ?? asUuid(meta?.user_id)
        if (!userId) {
          return await recordAndSkip(event, 'unmapped', appTag, 'no usable ViaStellis user id')
        }
        subscriptionId = session.subscription ? String(session.subscription) : null
        break
      }

      // ── Subscription paid (initial + every renewal) ──────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = subscriptionIdFromInvoice(invoice)

        // An invoice carries no app tag of its own — the owning SUBSCRIPTION does.
        // Without this lookup a Shattered Saga renewal could resolve by customer
        // id to a ViaStellis user and hand them Premium for free.
        let subMeta: Record<string, string> | null = null
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId)
          subMeta = sub.metadata as Record<string, string> | null
        }
        scope = scopeOf(subMeta)
        appTag = subMeta?.app ?? null

        // Same ownership-before-guard reasoning as the subscription branch: an
        // untagged renewal for a subscription we already store is ours, and must
        // not be dropped just because the backfill has not tagged it yet.
        const ownedInvoiceUserId = subId ? await userIdForSubscription(subId) : null
        if (isExplicitlyForeign(subMeta) || (scope === 'foreign' && !ownedInvoiceUserId)) {
          return await recordAndSkip(event, 'foreign', appTag, `invoice for ${appTag ?? 'untagged/unowned'}`)
        }

        subscriptionId = subId
        userId =
          ownedInvoiceUserId ??
          asUuid(subMeta?.user_id) ??
          // Legacy: pre-tagging subscriptions have no stored subscription id.
          (await userIdForCustomer(invoice.customer ? String(invoice.customer) : null))
        if (!userId) {
          return await recordAndSkip(event, 'unmapped', appTag, 'invoice maps to no ViaStellis user')
        }
        break
      }

      // ── Subscription state changed / ended ───────────────────
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const meta = sub.metadata as Record<string, string> | null
        scope = scopeOf(meta)
        appTag = meta?.app ?? null

        // THE important guard: without it, cancelling a Shattered Saga plan
        // would set this person's ViaStellis tier to 'free' with no error.
        //
        // Ownership is checked BEFORE the guard so an untagged subscription we
        // already store is never dropped. Under STRICT, scopeOf() reports
        // untagged objects as foreign — correct for genuinely foreign ones, but
        // it would also silently ignore a legacy ViaStellis subscription that
        // the backfill missed, quietly ending a paying customer's renewals. Our
        // own profiles row is stronger evidence than absent Stripe metadata: a
        // Shattered Saga subscription id can never appear there.
        const ownedSubscriptionUserId = await userIdForSubscription(sub.id)
        if (isExplicitlyForeign(meta) || (scope === 'foreign' && !ownedSubscriptionUserId)) {
          return await recordAndSkip(event, 'foreign', appTag, `subscription for ${appTag ?? 'untagged/unowned'}`)
        }

        subscriptionId = sub.id
        userId =
          ownedSubscriptionUserId ??
          asUuid(meta?.user_id) ??
          // Legacy only, and only because scope is 'ours' or 'unknown' here.
          (await userIdForCustomer(String(sub.customer)))
        if (!userId) {
          return await recordAndSkip(event, 'unmapped', appTag, 'subscription maps to no ViaStellis user')
        }
        break
      }

      default:
        // Unhandled event types are fine — just acknowledge them.
        return ok()
    }

    if (scope === 'unknown') {
      // Expected only for objects created before app tagging existed; the
      // backfill script should eliminate these. Worth noticing if it persists.
      console.warn(
        `stripe-webhook ${event.type} ${event.id}: untagged, assuming ${APP_TAG} (legacy)`,
      )
    }

    let action: 'checkout_subscription' | 'checkout_pack' | 'invoice_paid' | 'subscription_state' | null = null
    let credits = 0
    let creditSource: 'pack' | 'subscription' | null = null
    let amountCents: number | null = null
    let tier: 'premium' | 'free' | null = null
    let status: string | null = null
    let priceId: string | null = null
    let periodEnd: string | null = null
    let customerId: string | null = null

    switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          customerId = session.customer ? String(session.customer) : null
          if (session.mode === 'payment') {
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
              expand: ['data.price'],
              limit: 100,
            })
            credits = creditsFromLineItems(lineItems.data)
            creditSource = 'pack'
            amountCents = session.amount_total
            action = 'checkout_pack'
          } else {
            action = 'checkout_subscription'
            tier = 'premium'
            status = 'active'
          }
          break
        }

        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice

          action = 'invoice_paid'
          credits = creditsFromLineItems(invoice.lines.data)
          creditSource = 'subscription'
          amountCents = invoice.amount_paid
          tier = 'premium'
          status = 'active'
          customerId = invoice.customer ? String(invoice.customer) : null
          const periodEndUnix = invoice.lines.data[0]?.period?.end
          periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null
          priceId = (invoice.lines.data[0] as { price?: { id?: string } })?.price?.id ?? null
          break
        }

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription
          const active = sub.status === 'active' || sub.status === 'trialing'

          action = 'subscription_state'
          tier = active ? 'premium' : 'free'
          status = sub.status
          priceId = sub.items.data[0]?.price?.id ?? null
          const item0 = sub.items.data[0] as
            | (typeof sub.items.data[0] & { current_period_end?: number })
            | undefined
          const periodEndUnix = sub.current_period_end ?? item0?.current_period_end
          periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null
          break
        }
    }

    if (!action) return ok()
    const { data: result, error: applyError } = await admin.rpc('apply_stripe_event', {
      p_event_id: event.id, p_event_type: event.type, p_app: appTag ?? APP_TAG,
      p_user_id: userId, p_action: action, p_credits: credits,
      p_credit_source: creditSource, p_amount_cents: amountCents, p_tier: tier,
      p_status: status, p_price_id: priceId, p_period_end: periodEnd,
      p_customer_id: customerId, p_subscription_id: subscriptionId, p_source: 'stripe',
    })
    if (applyError) throw applyError
    if (result === 'duplicate') console.log(`stripe-webhook ${event.type} ${event.id}: duplicate`)

    return ok()
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err)
    // 500 tells Stripe to retry later.
    return new Response('Webhook handler failed', { status: 500 })
  }
})
