/** Tags identify the product; untagged objects require an exact DB binding.
 * There is no global switch that assigns all legacy objects to ViaStellis.
 */
export const APP_TAG = 'viastellis'
export function isExplicitlyForeign(metadata: Record<string,string>|null|undefined): boolean {
 return !!metadata?.app && metadata.app!==APP_TAG
}
export function asUuid(value: unknown): string|null {
 return typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null
}
