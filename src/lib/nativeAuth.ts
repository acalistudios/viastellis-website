export const NATIVE_AUTH_ERROR = 'Google sign-in could not be completed. Please try signing in again.'

type AuthResult = 'success' | 'error' | null

// Keep one exchange per callback across warm events, launch URLs and React
// effect remounts. Never persist or log callback URLs/auth codes.
export function createNativeAuthHandler(
  exchange: (code: string) => Promise<{ error: unknown }>,
  close: () => Promise<void>,
) {
  const results = new Map<string, Promise<AuthResult>>()
  return (raw: string): Promise<AuthResult> => {
    let url: URL
    try { url = new URL(raw) } catch { return Promise.resolve(null) }
    if (url.protocol !== 'com.acalistudios.viastellis:' || url.hostname !== 'auth-callback' ||
        !['', '/'].includes(url.pathname) || url.username || url.password || url.port) return Promise.resolve(null)
    const code = url.searchParams.get('code')
    const hash = new URLSearchParams(url.hash.slice(1))
    const invalid = url.searchParams.has('error') || hash.has('error') || !code || url.searchParams.getAll('code').length !== 1
    const key = invalid ? raw : code
    const existing = results.get(key)
    if (existing) return existing
    const task = (async (): Promise<AuthResult> => {
      try { await close() } catch { /* Android may already have closed its tab. */ }
      // This app initiates PKCE. Never accept unsolicited implicit-flow tokens.
      if (invalid) return 'error'
      try { return (await exchange(code)).error ? 'error' : 'success' } catch { return 'error' }
    })()
    results.set(key, task)
    if (results.size > 8) results.delete(results.keys().next().value!)
    return task
  }
}
