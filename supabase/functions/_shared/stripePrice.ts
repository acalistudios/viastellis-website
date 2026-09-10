import { APP_TAG } from './stripeApp.ts'

export type PriceScope = 'ours' | 'legacy-ours' | 'foreign'

/** Classify a Stripe Price without trusting a browser-supplied id. */
export function priceScope(metadata: Record<string, string> | null | undefined): PriceScope {
  if (metadata?.app === APP_TAG) return 'ours'
  if (!metadata?.app && metadata?.credits) return 'legacy-ours'
  return 'foreign'
}

export function taggedPriceMetadata(
  metadata: Record<string, string> | null | undefined,
): Record<string, string> {
  return { ...metadata, app: APP_TAG }
}
