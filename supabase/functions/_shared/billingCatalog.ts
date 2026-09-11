export const VIA_CATALOG = {
 vs_sub_monthly: { amount: 499, credits: 30, interval: 'month' },
 vs_sub_annual_3999: { amount: 3999, credits: 360, interval: 'year' },
 vs_pack_taster: { amount: 99, credits: 10, interval: null },
 vs_pack_standard: { amount: 299, credits: 35, interval: null },
 vs_pack_value: { amount: 599, credits: 80, interval: null },
 vs_pack_bulk: { amount: 1299, credits: 200, interval: null },
} as const
export function viaPrice(price: { active?: boolean; lookup_key?: string | null; unit_amount?: number | null; currency?: string; metadata?: Record<string,string> | null; recurring?: { interval?: string; interval_count?: number } | null }, requireActive = true) {
 const key = price.lookup_key
 if (!key || !Object.hasOwn(VIA_CATALOG,key)) throw new Error('Unknown ViaStellis catalog item')
 const item = VIA_CATALOG[key as keyof typeof VIA_CATALOG]
 if ((requireActive && !price.active) || price.metadata?.app !== 'viastellis' || price.currency !== 'usd'
   || price.unit_amount !== item.amount || (price.recurring?.interval ?? null) !== item.interval
   || (price.recurring && price.recurring.interval_count !== 1)
   || price.metadata?.credits !== String(item.credits)) throw new Error('ViaStellis price configuration mismatch')
 return item
}
export function stripeId(value: unknown): string | null {
 if (typeof value==='string') return value
 if (value && typeof value==='object' && 'id' in value && typeof value.id==='string') return value.id
 return null
}
export function invoiceSubscription(value: any): string | null {
 return stripeId(value.subscription ?? value.parent?.subscription_details?.subscription)
}
