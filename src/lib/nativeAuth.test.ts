import { expect, test, vi } from 'vitest'
import { createNativeAuthHandler } from './nativeAuth'

const callback = 'com.acalistudios.viastellis://auth-callback'
test('only the exact native callback may exchange a code or close the browser', async () => {
  const exchange = vi.fn().mockResolvedValue({ error: null }), close = vi.fn()
  const handle = createNativeAuthHandler(exchange, close)
  for (const url of ['garbage', 'https://example.test/auth-callback?code=a',
    callback + '.evil?code=a', callback + '/other?code=a',
    'com.acalistudios.viastellis://home?next=auth-callback&code=a']) {
    expect(await handle(url)).toBeNull()
  }
  expect(exchange).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled()
})
test('warm/cold duplicate callbacks exchange once, even while pending', async () => {
  let finish!: (result: { error: null }) => void
  const exchange = vi.fn(() => new Promise<{ error: null }>(resolve => { finish = resolve }))
  const handle = createNativeAuthHandler(exchange, vi.fn().mockRejectedValue(new Error('no tab')))
  const first = handle(callback + '?code=one')
  const second = handle(callback + '/?code=one')
  await vi.waitFor(() => expect(exchange).toHaveBeenCalledTimes(1))
  finish({ error: null })
  expect(await first).toBe('success'); expect(await second).toBe('success')
  expect(await handle(callback + '?code=one')).toBe('success')
  expect(exchange).toHaveBeenCalledTimes(1)
})
test('provider errors, missing/duplicate codes and unsolicited tokens fail closed', async () => {
  const exchange = vi.fn(), handle = createNativeAuthHandler(exchange, vi.fn())
  for (const suffix of ['?error=access_denied', '#error=access_denied', '', '?code=a&code=b',
    '#access_token=private&refresh_token=private']) expect(await handle(callback + suffix)).toBe('error')
  expect(exchange).not.toHaveBeenCalled()
})
test('exchange failure is contained and a fresh sign-in can succeed', async () => {
  const exchange = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue({ error: null })
  const handle = createNativeAuthHandler(exchange, vi.fn())
  expect(await handle(callback + '?code=old')).toBe('error')
  expect(await handle(callback + '?code=new')).toBe('success')
})
