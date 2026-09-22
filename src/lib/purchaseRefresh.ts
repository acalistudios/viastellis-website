export async function waitForPurchaseProfile<T>(
  read: () => Promise<T | null>, matches: (profile: T) => boolean, signal: AbortSignal,
) {
  for (const delay of [0, 1000, 2000, 3000, 5000, 8000]) {
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
