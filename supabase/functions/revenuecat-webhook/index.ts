/**
 * revenuecat-webhook — Supabase Edge Function
 *
 * Verifies and handles webhook events from RevenueCat for Google Play Billing.
 * Reconciled with existing Supabase billing procedures (grant_credits, set_subscription).
 *
 * Security:
 * - Verified via shared secret in Authorization header (REVENUECAT_WEBHOOK_SECRET).
 * - Client NEVER self-reports purchases or grants credits.
 * - Idempotency: dedupes on event.id via grant_credits() and claim_stripe_event().
 * - Dual-rail guard: EXPIRATION only downgrades if profile.subscription_source === 'play'.
 *
 * Deploy with JWT verification OFF:
 *   supabase functions deploy revenuecat-webhook --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface ProductDef {
  tier?: 'premium' | 'free'
  credits: number
  mode: 'subscription' | 'pack'
}

/**
 * Product catalog mapping Google Play / RevenueCat product IDs to credits & tiers.
 * Matches website/src/config/pricing.ts and ANDROID_HANDOFF.md §6.2.
 */
const SUB_MONTHLY: ProductDef = { tier: 'premium', credits: 30, mode: 'subscription' }
const SUB_ANNUAL: ProductDef = { tier: 'premium', credits: 360, mode: 'subscription' }

const PRODUCT_MAP: Record<string, ProductDef> = {
  // Subscriptions. Google Play reports these as "<subscriptionId>:<basePlanId>".
  // NOTE: there is deliberately no bare 'viastellis_premium' entry — mapping it
  // to a plan would silently treat an ANNUAL purchase as monthly. That case is
  // resolved from the billing period instead (see resolveProduct).
  'viastellis_premium:monthly': SUB_MONTHLY,
  'viastellis_premium:annual': SUB_ANNUAL,
  'monthly': SUB_MONTHLY,
  'annual': SUB_ANNUAL,

  // Consumable credit packs — must stay in step with website/src/config/pricing.ts
  // (10/$0.99, 35/$2.99, 80/$5.99, 200/$12.99) and the matching Stripe prices.
  'credits_taster': { credits: 10, mode: 'pack' },
  'credits_standard': { credits: 35, mode: 'pack' },
  'credits_value': { credits: 80, mode: 'pack' },
  'credits_bulk': { credits: 200, mode: 'pack' },
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A period longer than this is an annual plan; shorter is monthly. */
const ANNUAL_THRESHOLD_MS = 180 * 24 * 60 * 60 * 1000

/**
 * Map a RevenueCat product id to our catalog entry.
 *
 * Deliberately EXACT — an earlier version fell back to bidirectional substring
 * matching, which could never return null and so quietly returned the wrong
 * product. With keys like 'monthly' present, an id such as
 * 'viastellis_premium_annual' matched the monthly entry and would have granted
 * an annual subscriber 30 credits instead of 360.
 *
 * Resolution order:
 *   1. exact id
 *   2. "<subscriptionId>:<basePlanId>" — try the pair, then the base plan alone
 *   3. bare subscription id with no base plan — infer the plan from the billing
 *      period rather than guessing, since the id alone cannot distinguish them
 */
function resolveProduct(
  productId: string,
  period?: { purchasedAtMs?: number | null; expirationAtMs?: number | null },
): ProductDef | null {
  const exact = PRODUCT_MAP[productId]
  if (exact) return exact

  const [base, plan] = productId.split(':')
  if (plan) {
    return PRODUCT_MAP[`${base}:${plan}`] ?? PRODUCT_MAP[plan] ?? null
  }

  // Bare subscription id (no base plan): decide from the period length.
  if (base === 'viastellis_premium') {
    const { purchasedAtMs, expirationAtMs } = period ?? {}
    if (purchasedAtMs && expirationAtMs) {
      return expirationAtMs - purchasedAtMs > ANNUAL_THRESHOLD_MS ? SUB_ANNUAL : SUB_MONTHLY
    }
    // Unknowable from this payload — let the caller treat it as unresolved
    // rather than guess a credit amount.
    return null
  }

  return null
}

function ok(msg = 'ok') {
  return new Response(JSON.stringify({ received: true, message: msg }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!WEBHOOK_SECRET) return new Response('Not configured', { status: 503 })
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token || token !== WEBHOOK_SECRET.trim()) return new Response('Unauthorized', { status: 401 })
  let event: any
  try { event = (await req.json()).event } catch { return new Response('Invalid JSON', { status: 400 }) }
  if (!event?.id || !event?.type || !event?.app_user_id || !UUID_REGEX.test(event.app_user_id)) return ok('unmapped')
  if (event.environment !== (Deno.env.get('REVENUECAT_ENVIRONMENT') ?? 'PRODUCTION')) return ok('foreign environment')
  // Only the known ViaStellis product namespace; never match a foreign base
  // subscription using a generic "monthly" or "annual" suffix.
  if (typeof event.product_id !== 'string' || !(event.product_id === 'viastellis_premium' || event.product_id.startsWith('viastellis_premium:') || ['credits_taster','credits_standard','credits_value','credits_bulk'].includes(event.product_id))) return ok('foreign product')
  const supported = ['INITIAL_PURCHASE','RENEWAL','PRODUCT_CHANGE','NON_RENEWING_PURCHASE','CANCELLATION','EXPIRATION','BILLING_ISSUE','UNCANCELLATION']
  if (!supported.includes(event.type)) return ok('unsupported')
  try {
    const { data: profile, error: profileError } = await admin.from('profiles').select('id').eq('id',event.app_user_id).maybeSingle()
    if (profileError) throw profileError
    if (!profile) return ok('unmapped')
    const product = resolveProduct(event.product_id, { purchasedAtMs:event.purchased_at_ms, expirationAtMs:event.expiration_at_ms })
    if (!product) throw new Error('Unresolved ViaStellis product')
    const purchase = ['INITIAL_PURCHASE','RENEWAL','NON_RENEWING_PURCHASE'].includes(event.type)
    if (purchase && !event.transaction_id) throw new Error('Missing transaction identity')
    if (!Number.isSafeInteger(event.event_timestamp_ms)) throw new Error('Missing event timestamp')
    const expires = Math.max(event.expiration_at_ms ?? 0, event.grace_period_expiration_at_ms ?? 0)
    const active = event.type !== 'EXPIRATION' && expires > Date.now()
    const externalId = product.mode === 'subscription' ? event.original_transaction_id : null
    if (product.mode === 'subscription' && !externalId) throw new Error('Missing subscription identity')
    const { error } = await admin.rpc('apply_billing_event', {
      p_event_id:'revenuecat:'+event.id,p_event_type:event.type,p_provider:'play',p_user_id:event.app_user_id,
      p_external_id:externalId,p_tier:externalId?(active?'premium':'free'):null,
      p_status:externalId?(active?'active':'canceled'):null,p_period_end:expires?new Date(expires).toISOString():null,
      p_price_id:event.product_id,p_observed_at:event.event_timestamp_ms,
      p_credits:purchase?product.credits:0,p_grant_key:purchase?'play:transaction:'+event.transaction_id:null,
      p_credit_source:product.mode==='pack'?'pack':'subscription',
      p_amount_cents:Math.round((event.price_in_purchased_currency??0)*100),p_customer_id:null,
    })
    if (error) throw error
    return ok()
  } catch (error) { console.error('RevenueCat fulfillment failed',event.id,error);return new Response('Processing failed',{status:500}) }
})
