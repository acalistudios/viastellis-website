/**
 * One-time setup: create ViaStellis Products + Prices in your Stripe account.
 *
 * Each Price carries metadata.credits, which stripe-webhook reads to grant the
 * right number of credits — so pricing lives in Stripe, not in code.
 *
 * Usage (PowerShell):
 *   $env:STRIPE_SECRET_KEY = "sk_test_..."   # your TEST key first
 *   node scripts/setup-stripe-products.mjs
 *
 * It's safe to re-run: it looks up existing products by a stable lookup_key and
 * reuses them instead of creating duplicates. At the end it prints the Price IDs
 * to paste into your .env (VITE_STRIPE_*) or src/config/pricing.ts.
 *
 * Requires: npm i -D stripe  (dev dependency, not shipped to the browser).
 */

import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('❌ Set STRIPE_SECRET_KEY first (use your sk_test_... key).')
  process.exit(1)
}
const stripe = new Stripe(key)

// Each entry → one Product + one Price. lookup_key makes re-runs idempotent.
const CATALOG = [
  { env: 'MONTHLY',       name: 'ViaStellis Premium (Monthly)', credits: 30,  amount: 499,   recurring: { interval: 'month' }, trial_days: 7, lookup_key: 'vs_sub_monthly' },
  { env: 'ANNUAL',        name: 'ViaStellis Premium (Annual)',  credits: 360, amount: 3999,  recurring: { interval: 'year' },                lookup_key: 'vs_sub_annual_3999' },
  { env: 'PACK_TASTER',   name: 'ViaStellis 10 Credits',        credits: 10,  amount: 99,    recurring: null, lookup_key: 'vs_pack_taster'   },
  { env: 'PACK_STANDARD', name: 'ViaStellis 35 Credits',        credits: 35,  amount: 299,   recurring: null, lookup_key: 'vs_pack_standard' },
  { env: 'PACK_VALUE',    name: 'ViaStellis 80 Credits',        credits: 80,  amount: 599,   recurring: null, lookup_key: 'vs_pack_value'    },
  { env: 'PACK_BULK',     name: 'ViaStellis 200 Credits',       credits: 200, amount: 1299,  recurring: null, lookup_key: 'vs_pack_bulk'     },
]

async function findExistingPrice(lookup_key) {
  const prices = await stripe.prices.list({ lookup_keys: [lookup_key], expand: ['data.product'], limit: 1 })
  return prices.data[0] ?? null
}

const results = {}

for (const item of CATALOG) {
  const existing = await findExistingPrice(item.lookup_key)
  if (existing) {
    if (!existing.active || existing.currency!=='usd' || existing.unit_amount!==item.amount || (existing.recurring?.interval??null)!==(item.recurring?.interval??null) || (existing.recurring && existing.recurring.interval_count!==1)) throw new Error('Existing catalog price mismatch: '+existing.id)
    if (existing.metadata?.app && existing.metadata.app !== 'viastellis') {
      throw new Error(`${existing.id} is tagged for ${existing.metadata.app}; refusing to reuse it`)
    }
    if (existing.metadata?.app !== 'viastellis') {
      await stripe.prices.update(existing.id, {
        metadata: { ...existing.metadata, app: 'viastellis', credits: String(item.credits) },
      })
    }
    if (typeof existing.product !== 'string') {
      if (existing.product.metadata?.app && existing.product.metadata.app !== 'viastellis') {
        throw new Error(`${existing.product.id} is tagged for ${existing.product.metadata.app}; refusing to reuse it`)
      }
      if (existing.product.metadata?.app !== 'viastellis') {
        await stripe.products.update(existing.product.id, {
          metadata: { ...existing.product.metadata, app: 'viastellis' },
        })
      }
    }
    console.log(`↺ reused ${item.name} → ${existing.id}`)
    results[item.env] = existing.id
    continue
  }

  const product = await stripe.products.create({
    name: item.name,
    metadata: { app: 'viastellis' },
  })
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: item.amount,
    lookup_key: item.lookup_key,
    ...(item.recurring ? { recurring: item.recurring } : {}),
    metadata: { app: 'viastellis', credits: String(item.credits) },
  })

  // Attach a default trial to the monthly sub at the Price level isn't supported;
  // trials are set on the subscription. We record trial_days so the checkout
  // function / future code can apply it. (Monthly trial handled at checkout.)
  console.log(`✓ created ${item.name} → ${price.id}`)
  results[item.env] = price.id
}

console.log('\n──────── Paste these into your .env (and GitHub Actions secrets) ────────\n')
for (const [env, id] of Object.entries(results)) {
  console.log(`VITE_STRIPE_PRICE_${env}=${id}`)
}
console.log('\nDone. Use your sk_test_ key for testing, then re-run with sk_live_ for production.')
