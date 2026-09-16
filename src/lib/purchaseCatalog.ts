import type { PurchasesPackage } from '@revenuecat/purchases-capacitor'
import type { PlanOption } from '../config/pricing'

export function findPurchasePackage(packages: PurchasesPackage[], plan: PlanOption) {
  const matches = packages.filter(pkg => pkg.product.identifier === plan.playProductId)
  // Ambiguous offerings need configuration repair, never a guessed product.
  return matches.length === 1 ? matches[0] : undefined
}
