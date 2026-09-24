/**
 * Local persistence for the Stella conversation.
 *
 * The transcript previously lived only in component state, so navigating away
 * — or closing the app — threw it away. Each message costs a credit, so people
 * were paying for readings they then could not get back to.
 *
 * Deliberately localStorage, not a database table:
 *
 *   - Nothing leaves the device, so the Play Data safety declaration ("Other
 *     in-app messages", not collected) stays true. Storing transcripts
 *     server-side would require re-filing that declaration before release.
 *   - No table, no RLS policy, no migration, no new failure mode in the
 *     billing-adjacent path.
 *
 * What that costs, and is worth stating plainly rather than discovering later:
 *
 *   - It does NOT sync. localStorage is per origin, and the app's WebView and
 *     viastellis.com are different origins, so each keeps its own history.
 *     This is the same boundary that made tarot unlocks look un-bought across
 *     platforms; the difference is that tarot ownership lives server-side and
 *     could be read back, whereas here there is deliberately nothing to read.
 *   - Clearing app data, or uninstalling, loses it.
 *
 * Keyed per user so two accounts on one device never see each other's chat.
 */

import type { ChatMessage } from '@/types'

const PREFIX = 'viastellis-stella-chat-'

/** Keep the tail only. Long transcripts are the common way to blow the ~5MB quota. */
const MAX_MESSAGES = 100

export function historyKey(userId: string | undefined): string {
  return PREFIX + (userId ?? 'anon')
}

export function loadHistory(userId: string | undefined): ChatMessage[] {
  try {
    const raw = localStorage.getItem(historyKey(userId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Tolerate anything shape-shifted by an older build rather than throwing
    // the whole conversation away on one bad entry. isStreaming is dropped:
    // a reply interrupted mid-stream must not come back still "streaming".
    return parsed
      .filter((m): m is ChatMessage => {
        const c = m as Partial<ChatMessage> | null
        return !!c && typeof c === 'object' &&
          typeof c.id === 'string' &&
          typeof c.text === 'string' &&
          typeof c.timestamp === 'string' &&
          (c.role === 'user' || c.role === 'stella')
      })
      .map(({ isStreaming: _drop, ...m }) => m)
  } catch {
    return []
  }
}

export function saveHistory(userId: string | undefined, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(historyKey(userId), JSON.stringify(messages.slice(-MAX_MESSAGES)))
  } catch {
    // Quota exceeded or storage blocked (private window, cleared site data).
    // The conversation still works for this session; it just will not persist.
  }
}

export function clearHistory(userId: string | undefined): void {
  try {
    localStorage.removeItem(historyKey(userId))
  } catch { /* ignore */ }
}
