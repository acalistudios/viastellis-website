import { beforeEach, expect, test, vi } from 'vitest'
import { clearHistory, historyKey, loadHistory, saveHistory } from './stellaHistory'
import { isBareTitle } from '@/components/ui/MarkdownText'
import type { ChatMessage } from '@/types'

// Minimal localStorage, since these tests run in the node environment.
beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
})

const msg = (id: string, role: ChatMessage['role'], text: string): ChatMessage =>
  ({ id, role, text, timestamp: '2026-09-24T10:00:00Z' })

test('a conversation survives a round trip, and is scoped per user', () => {
  const mine = [msg('1', 'user', 'hi'), msg('2', 'stella', 'hello')]
  saveHistory('user-a', mine)
  expect(loadHistory('user-a')).toEqual(mine)
  // A second account on the same device must not inherit it.
  expect(loadHistory('user-b')).toEqual([])
  expect(historyKey('user-a')).not.toBe(historyKey('user-b'))
})

test('a half-streamed reply does not come back still streaming', () => {
  saveHistory('u', [{ ...msg('1', 'stella', 'partial'), isStreaming: true }])
  expect(loadHistory('u')[0]).not.toHaveProperty('isStreaming')
})

test('one corrupt entry does not discard the whole conversation', () => {
  localStorage.setItem(historyKey('u'), JSON.stringify([
    msg('1', 'user', 'kept'),
    { id: 2, role: 'user' },          // wrong types
    null,
    { role: 'martian', text: 'x', id: '3', timestamp: 'y' },
  ]))
  const out = loadHistory('u')
  expect(out).toHaveLength(1)
  expect(out[0].text).toBe('kept')
})

test('unreadable or absent storage yields an empty history rather than throwing', () => {
  expect(loadHistory('nobody')).toEqual([])
  localStorage.setItem(historyKey('u'), 'not json')
  expect(loadHistory('u')).toEqual([])
  vi.stubGlobal('localStorage', {
    getItem: () => { throw new Error('blocked') },
    setItem: () => { throw new Error('blocked') },
    removeItem: () => { throw new Error('blocked') },
  })
  expect(loadHistory('u')).toEqual([])
  expect(() => saveHistory('u', [msg('1', 'user', 'x')])).not.toThrow()
  expect(() => clearHistory('u')).not.toThrow()
})

test('clearing removes only that user’s conversation', () => {
  saveHistory('a', [msg('1', 'user', 'a')])
  saveHistory('b', [msg('1', 'user', 'b')])
  clearHistory('a')
  expect(loadHistory('a')).toEqual([])
  expect(loadHistory('b')).toHaveLength(1)
})

test('only long transcripts are trimmed, keeping the most recent turns', () => {
  saveHistory('u', Array.from({ length: 140 }, (_, i) => msg(String(i), 'user', `m${i}`)))
  const out = loadHistory('u')
  expect(out).toHaveLength(100)
  expect(out[out.length - 1].text).toBe('m139')   // newest kept
  expect(out[0].text).toBe('m40')                 // oldest dropped
})

// ── The bare-title heuristic ────────────────────────────────────────────────
// A false positive turns a real sentence into a heading, so the negatives
// matter more than the positives here.

test('unmarked section titles are recognised', () => {
  for (const t of ['Your Life Path', 'Your Expression', 'Love & Relationships', 'Ideal Fields & Industries'])
    expect(isBareTitle([t])).toBe(true)
})

test('prose is never promoted to a heading', () => {
  for (const t of [
    'You are here to learn the art of detachment.',     // ends in a full stop
    'Your natural talents and the outer personality you project into the world are governed by six',
    '- a bullet item',
    '1. a numbered item',
    '**already bold**',
    'In short:',                                        // trailing colon
    '',
  ]) expect(isBareTitle([t])).toBe(false)
  // Multi-line blocks are paragraphs, never titles.
  expect(isBareTitle(['Your Life Path', 'and more text'])).toBe(false)
})
