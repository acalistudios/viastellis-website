/**
 * Pricing catalog (display + Stripe Price IDs).
 *
 * The dollar amounts and labels here are for DISPLAY only — the real charge is
 * whatever the Stripe Price says. After you run `node scripts/setup-stripe-products.mjs`,
 * paste the printed Price IDs into the `priceId` fields below (or set the
 * matching VITE_STRIPE_* env vars, which take precedence).
 *
 * Credits per purchase are defined on each Stripe Price's metadata.credits and
 * granted server-side by stripe-webhook — they are intentionally NOT trusted
 * from this client file.
 */

export interface PlanOption {
  id: string
  label: string
  /** Human-readable price, display only. */
  priceLabel: string
  /** Sub-label, e.g. credits/month. */
  detail: string
  credits: number
  mode: 'subscription' | 'payment'
  priceId: string
  highlight?: boolean
  badge?: string
}

const env = import.meta.env

export const SUBSCRIPTIONS: PlanOption[] = [
  {
    id: 'monthly',
    label: 'Monthly',
    priceLabel: '$4.99 / mo',
    detail: '30 credits every month · 7-day free trial',
    credits: 30,
    mode: 'subscription',
    priceId: env.VITE_STRIPE_PRICE_MONTHLY ?? '',
    highlight: true,
    badge: 'Most popular',
  },
  {
    id: 'annual',
    label: 'Annual',
    priceLabel: '$39.99 / yr',
    detail: '360 credits up front · save $19.89 vs monthly',
    credits: 360,
    mode: 'subscription',
    priceId: env.VITE_STRIPE_PRICE_ANNUAL ?? '',
    badge: 'Best value',
  },
]

export const CREDIT_PACKS: PlanOption[] = [
  {
    id: 'taster',
    label: 'Taster',
    priceLabel: '$0.99',
    detail: '10 credits',
    credits: 10,
    mode: 'payment',
    priceId: env.VITE_STRIPE_PRICE_PACK_TASTER ?? '',
  },
  {
    id: 'standard',
    label: 'Standard',
    priceLabel: '$2.99',
    detail: '35 credits',
    credits: 35,
    mode: 'payment',
    priceId: env.VITE_STRIPE_PRICE_PACK_STANDARD ?? '',
  },
  {
    id: 'value',
    label: 'Value',
    priceLabel: '$5.99',
    detail: '80 credits',
    credits: 80,
    mode: 'payment',
    priceId: env.VITE_STRIPE_PRICE_PACK_VALUE ?? '',
    highlight: true,
  },
  {
    id: 'bulk',
    label: 'Bulk',
    priceLabel: '$12.99',
    detail: '200 credits',
    credits: 200,
    mode: 'payment',
    priceId: env.VITE_STRIPE_PRICE_PACK_BULK ?? '',
  },
]
