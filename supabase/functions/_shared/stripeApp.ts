/**
 * stripeApp — app scoping for a Stripe account shared across ACALI products.
 *
 * WHY THIS EXISTS: the ACALI Studios Stripe account (acalistudios@gmail.com) is
 * shared between ViaStellis and Shattered Saga. Stripe delivers webhook events
 * ACCOUNT-WIDE — every endpoint receives every event type it subscribes to,
 * regardless of which product created it. So ViaStellis's endpoint now receives
 * Shattered Saga's checkout and subscription events.
 *
 * Both products stamp metadata.app on the Checkout Session AND on the
 * subscription itself (via subscription_data.metadata) — the latter matters
 * because subscription lifecycle events do NOT carry the originating session's
 * metadata. Shattered Saga uses the tag "shattered-saga"; we use "viastellis".
 *
 * See supabase/migrations/2026-08-05_stripe_app_scoping.sql for the DB side.
 */

export const APP_TAG = 'viastellis'

export type AppScope =
  | 'ours'      // explicitly tagged viastellis
  | 'foreign'   // explicitly tagged as some other product — never touch
  | 'unknown'   // no tag at all (see LEGACY note below)

/**
 * STRICT MODE — the permanent fix for untagged objects.
 *
 * Set the Supabase secret STRIPE_STRICT_APP_SCOPE=true once the backfill
 * (scripts/backfill-stripe-app-metadata.mjs --apply) has tagged every existing
 * ViaStellis subscription and price. From then on an untagged object is treated
 * as FOREIGN and ignored, so we no longer rely on "untagged means ours".
 *
 * Why it isn't the default yet: our current live subscriptions were created
 * before tagging existed. Turning this on before the backfill would make the
 * webhook ignore real paying customers' renewals and cancellations.
 *
 * Order of operations:
 *   1. deploy this code            (tags every NEW object)
 *   2. run the backfill --apply    (tags every OLD object)
 *   3. set STRIPE_STRICT_APP_SCOPE=true and redeploy
 *
 * Flipping it back to false is an instant rollback if anything looks wrong.
 */
const STRICT = Deno.env.get('STRIPE_STRICT_APP_SCOPE') === 'true'

/**
 * Classify an event by its metadata.app tag.
 *
 * LEGACY / MIGRATION GAP: subscriptions and sessions created BEFORE this change
 * carry no app tag, so they arrive as 'unknown'. ViaStellis predates Shattered
 * Saga on this Stripe account, so an untagged object is ours by construction —
 * we treat 'unknown' as ViaStellis until STRICT mode is enabled.
 *
 * NOTE for the other product: Shattered Saga must NOT mirror this assumption.
 * If both products claim untagged objects, every pre-existing subscription gets
 * processed twice. Anything untagged on this account predates Shattered Saga.
 */
export function scopeOf(metadata: Record<string, string> | null | undefined): AppScope {
  const tag = metadata?.app
  // Under STRICT, "untagged" is no longer given the benefit of the doubt.
  if (!tag) return STRICT ? 'foreign' : 'unknown'
  return tag === APP_TAG ? 'ours' : 'foreign'
}

/** True when this event belongs to another ACALI product and must be ignored. */
export function isForeign(metadata: Record<string, string> | null | undefined): boolean {
  return scopeOf(metadata) === 'foreign'
}

/**
 * Tagged for a DIFFERENT product — foreign beyond any doubt, whatever STRICT says.
 *
 * Distinguishing this from scopeOf()'s 'foreign' matters because STRICT also
 * reports UNTAGGED objects as foreign. An untagged object is only *presumed*
 * foreign; this one is provably so. Callers that can check ownership another way
 * (e.g. we already store the subscription id) should gate on this instead, so a
 * missed backfill cannot silently drop a real paying customer's renewal.
 */
export function isExplicitlyForeign(metadata: Record<string, string> | null | undefined): boolean {
  const tag = metadata?.app
  return !!tag && tag !== APP_TAG
}

/**
 * Guard against a foreign product's user id reaching a uuid-typed SQL argument.
 *
 * Shattered Saga runs on Cloudflare D1 and its user ids are not necessarily
 * UUIDs. Passing one to set_subscription(p_user_id uuid, …) raises
 * "invalid input syntax for type uuid", which the webhook catch block turns
 * into a 500 — and a 500 tells Stripe to RETRY, forever. An untagged foreign
 * event would become a poison pill. Validate before it ever reaches Postgres.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function asUuid(value: unknown): string | null {
  return typeof value === 'string' && UUID_RE.test(value) ? value : null
}
