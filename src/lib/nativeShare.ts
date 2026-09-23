/**
 * Sharing a generated image, on web and in the Capacitor shell.
 *
 * The web path and the native path share nothing but intent, because the
 * Android WebView supports neither of the browser mechanisms this used to rely
 * on:
 *
 *   - `navigator.share` / `navigator.canShare` are Chrome-browser APIs. They are
 *     not exposed to a WebView, so the old feature test always failed there.
 *   - The fallback, a synthetic `<a download>` click, needs a `DownloadListener`
 *     on the host WebView to do anything. MainActivity is a stock
 *     `BridgeActivity`, so downloads were dropped on the floor.
 *
 * The result was a button that did nothing at all in the app, silently, because
 * the caller also swallowed every error as "user cancelled the share sheet".
 * Hence `ShareOutcome` below: callers must be able to tell a genuine failure
 * from a deliberate dismissal, and show an error for the former only.
 */

import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Directory, Filesystem } from '@capacitor/filesystem'

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

/** Strip the `data:...;base64,` prefix Filesystem.writeFile does not want. */
function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the generated image.'))
    reader.onload = () => {
      const result = String(reader.result)
      const comma = result.indexOf(',')
      resolve(comma === -1 ? result : result.slice(comma + 1))
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * A share sheet dismissal is a normal outcome, not an error, but the platforms
 * report it inconsistently — iOS historically threw, Android may resolve. Match
 * on the message rather than trusting either.
 */
function isCancellation(err: unknown): boolean {
  const message = (err as { message?: string })?.message ?? ''
  return /cancel|abort|dismiss/i.test(message)
}

/**
 * Share `blob` as `filename`. Returns how it was handled so the caller can stay
 * quiet on a cancel and surface anything else.
 *
 * Native: write to CACHE (not Documents — this is a derived artefact the OS may
 * reclaim, and it keeps the user's document store clean), then hand the file URI
 * to the system share sheet.
 */
export async function shareImage(
  blob: Blob,
  filename: string,
  title: string,
): Promise<ShareOutcome> {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: await toBase64(blob),
      directory: Directory.Cache,
    })
    try {
      await Share.share({ title, files: [uri] })
      return 'shared'
    } catch (err) {
      if (isCancellation(err)) return 'cancelled'
      throw err
    }
  }

  // Browser: prefer a real share sheet when the platform offers one for files,
  // otherwise fall back to a download, which does work outside a WebView.
  const file = new File([blob], filename, { type: blob.type || 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (err) {
      if (isCancellation(err) || (err as { name?: string })?.name === 'AbortError') return 'cancelled'
      throw err
    }
  }

  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    return 'downloaded'
  } finally {
    URL.revokeObjectURL(url)
  }
}
