/**
 * Backfill metadata.app = "viastellis" onto pre-existing Stripe objects.
 *
 * WHY: the ACALI Studios Stripe account is shared with Shattered Saga, and Stripe
 * delivers webhook events account-wide. Both products now stamp metadata.app so
 * each webhook can ignore the other's events. Objects created BEFORE that change
 * carry no tag, so the handler falls back to "untagged means ViaStellis" — safe
 * only because ViaStellis predates Shattered Saga on this account. This script
 * removes the need for that assumption by tagging the existing objects.
 *
 * It tags:
 *   - Subscriptions that ViaStellis already owns in its profiles table
 *   - Prices          (drives create-checkout-session's price allowlist)
 *
 * It deliberately does NOT touch anything already tagged for another product,
 * and never modifies a Shattered Saga object.
 *
 * HOW TO RUN — two steps, in this order:
 *
 *   $env:STRIPE_SECRET_KEY = "sk_live_..."
 *
 *   # STEP 1 — preview. Reads Stripe only; changes NOTHING. Look at the output.
 *   node scripts/backfill-stripe-app-metadata.mjs
 *
 *   # STEP 2 — only if step 1 looked right. This actually writes to Stripe.
 *   node scripts/backfill-stripe-app-metadata.mjs --apply
 *
 * There is no way to "undo" step 2 in bulk, which is why step 1 exists. It is
 * safe to re-run either step as often as you like — already-tagged objects are
 * skipped, so a second --apply is a no-op.
 *
 * Requires: npm i -D stripe
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const APP_TAG = 'viastellis'
const APPLY = process.argv.includes('--apply')

const key = process.env.STRIPE_SECRET_KEY
const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!key || !supabaseUrl || !serviceRoleKey) {
  console.error('❌ Set STRIPE_SECRET_KEY, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY first.')
  process.exit(1)
}
const stripe = new Stripe(key)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

console.log(APPLY ? '⚠  APPLY mode — writing to Stripe\n' : 'ℹ  DRY RUN — nothing will be modified (pass --apply to write)\n')

let tagged = 0
let skippedForeign = 0
let alreadyOk = 0

/** Tag one object if it is untagged; report and skip if it belongs elsewhere. */
async function tag(kind, obj, update) {
  const current = obj.metadata?.app
  if (current === APP_TAG) { alreadyOk++; return }
  if (current) {
    console.log(`  ⏭  ${kind} ${obj.id} belongs to "${current}" — leaving alone`)
    skippedForeign++
    return
  }
  console.log(`  ${APPLY ? '✅' : '•'} ${kind} ${obj.id} → app=${APP_TAG}`)
  if (APPLY) await update()
  tagged++
}

// ── Subscriptions ────────────────────────────────────────────
// Stripe is not the source of truth for ownership on a shared account. Only IDs
// already stored by ViaStellis may be tagged; this makes the script safe even
// after additional ACALI products have launched.
console.log('Subscriptions:')
const { data: owners, error: ownersError } = await supabase
  .from('profiles')
  .select('id,stripe_subscription_id')
  .not('stripe_subscription_id', 'is', null)
if (ownersError) throw ownersError

for (const owner of owners ?? []) {
  const sub = await stripe.subscriptions.retrieve(owner.stripe_subscription_id)
  await tag('subscription', sub, () =>
    stripe.subscriptions.update(sub.id, {
      metadata: { ...sub.metadata, app: APP_TAG, user_id: owner.id },
    }),
  )
}

// ── Prices ───────────────────────────────────────────────────
// A ViaStellis price is identifiable by metadata.credits, which the webhook
// already reads to decide how many credits a purchase grants. Shattered Saga's
// prices don't carry it, so it's a reliable discriminator for untagged prices.
console.log('\nPrices:')
for await (const price of stripe.prices.list({ limit: 100 })) {
  if (!price.metadata?.credits && !price.metadata?.app) {
    console.log(`  ⏭  price ${price.id} has no credits metadata — not identifiably ViaStellis, skipping`)
    skippedForeign++
    continue
  }
  await tag('price', price, () =>
    stripe.prices.update(price.id, { metadata: { ...price.metadata, app: APP_TAG } }),
  )
}

console.log(
  `\n${APPLY ? 'Tagged' : 'Would tag'}: ${tagged}   Already correct: ${alreadyOk}   Left alone (other product / unidentifiable): ${skippedForeign}`,
)
if (!APPLY && tagged > 0) console.log('\nRe-run with --apply to write these changes.')
