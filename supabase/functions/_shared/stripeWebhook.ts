type PriceLine = { price?: { metadata?: Record<string, string> | null } | null; quantity?: number | null }

/** Sum only valid non-negative integer credit grants from trusted Stripe Prices. */
export function creditsFromLineItems(items: PriceLine[]): number {
  let total = 0
  for (const item of items) {
    const raw = item.price?.metadata?.credits
    if (!raw || !/^\d+$/.test(raw)) continue
    const credits = Number(raw)
    const quantity = item.quantity ?? 1
    if (!Number.isSafeInteger(credits) || !Number.isSafeInteger(quantity) || quantity < 1) continue
    const grant = credits * quantity
    if (!Number.isSafeInteger(grant) || grant < 0) continue
    total += grant
  }
  return Number.isSafeInteger(total) ? total : 0
}

/** Supports both pre-Basil and current Stripe invoice subscription shapes. */
export function subscriptionIdFromInvoice(invoice: {
  subscription?: string | { id: string } | null
  parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null
}): string | null {
  const legacy = invoice.subscription
  if (legacy) return typeof legacy === 'string' ? legacy : legacy.id
  const modern = invoice.parent?.subscription_details?.subscription
  if (modern) return typeof modern === 'string' ? modern : modern.id
  return null
}
