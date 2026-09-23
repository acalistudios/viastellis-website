/**
 * Poll the profile until a purchase shows up.
 *
 * Fulfilment is not synchronous: Play → RevenueCat → our webhook → Supabase.
 * The client cannot know when that lands, so it re-reads the profile on a
 * schedule and reports whether the expected change arrived.
 */

/**
 * The fast pass, run while the user is watching the button. ~19s in total.
 * Long enough for the common case, short enough not to look hung.
 */
export const FAST_POLL_MS = [0, 1000, 2000, 3000, 5000, 8000]

/**
 * The slow pass, run in the background AFTER the fast one has given up and the
 * "still syncing" notice is on screen. Adds ~2 minutes.
 *
 * This exists because the fast pass used to be the whole story: it gave up at
 * 19 seconds, showed "your purchase is still syncing", and then stopped polling
 * entirely. Nothing ever revived it, so the notice sat there indefinitely and
 * the only way to see the new balance was to hit Refresh or navigate away and
 * back. A webhook arriving at 25 seconds — which happens — looked identical to
 * one that never arrived at all.
 */
export const SLOW_POLL_MS = [10000, 15000, 20000, 30000, 30000, 30000]

export async function waitForPurchaseProfile<T>(
  read: () => Promise<T | null>,
  matches: (profile: T) => boolean,
  signal: AbortSignal,
  schedule: readonly number[] = FAST_POLL_MS,
) {
  for (const delay of schedule) {
    if (signal.aborted) return false
    if (delay) await new Promise<void>(resolve => {
      const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve() }
      const timer = setTimeout(finish, delay)
      signal.addEventListener('abort', finish, { once: true })
    })
    if (signal.aborted) return false
    const profile = await read().catch(() => null)
    if (signal.aborted) return false
    if (profile && matches(profile)) return true
  }
  return false
}
