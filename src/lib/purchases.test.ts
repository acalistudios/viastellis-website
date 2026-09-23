import { beforeEach, afterEach, expect, test, vi } from 'vitest'
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor'
import { SUBSCRIPTIONS } from '../config/pricing'
import { findPurchasePackage } from './purchaseCatalog'
import { SLOW_POLL_MS, waitForPurchaseProfile } from './purchaseRefresh'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), configure: vi.fn(), logIn: vi.fn(), logOut: vi.fn(),
  getOfferings: vi.fn(), purchasePackage: vi.fn(), restorePurchases: vi.fn(),
}))
vi.mock('./supabase', () => ({ supabase: { auth: { getSession: mocks.getSession } } }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@revenuecat/purchases-capacitor', () => ({ Purchases: mocks }))

const pkg = (identifier: string) => ({ product: { identifier }, packageType: 'MONTHLY' } as PurchasesPackage)
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks()
  vi.stubEnv('VITE_REVENUECAT_PUBLIC_KEY', 'goog_fixture')
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'alice' } } } })
  mocks.getOfferings.mockResolvedValue({ current: { availablePackages: [] } })
})
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

test('concurrent initialization and offerings configure once before loading', async () => {
  let ready!: () => void
  mocks.configure.mockImplementation(() => new Promise<void>(resolve => { ready = resolve }))
  const service = await import('./purchases')
  const first = service.initPurchases('alice')
  const offerings = service.getOfferings('alice')
  await vi.waitFor(() => expect(mocks.configure).toHaveBeenCalledTimes(1))
  expect(mocks.getOfferings).not.toHaveBeenCalled()
  ready(); await first; await offerings
  expect(mocks.configure).toHaveBeenCalledTimes(1)
  expect(mocks.getOfferings).toHaveBeenCalledTimes(1)
})

test('failed initialization can retry, but purchase cannot bypass it', async () => {
  const service = await import('./purchases')
  mocks.configure.mockRejectedValueOnce(new Error('offline'))
  await expect(service.purchasePackage(pkg('credits_taster'), 'alice')).rejects.toThrow('offline')
  expect(mocks.purchasePackage).not.toHaveBeenCalled()
  await service.purchasePackage(pkg('credits_taster'), 'alice')
  expect(mocks.configure).toHaveBeenCalledTimes(2)
  expect(mocks.purchasePackage).toHaveBeenCalledTimes(1)
})

test('missing key is visible and makes no SDK calls', async () => {
  vi.stubEnv('VITE_REVENUECAT_PUBLIC_KEY', '')
  const service = await import('./purchases')
  await expect(service.getOfferings('alice')).rejects.toThrow('not available in this build')
  expect(mocks.configure).not.toHaveBeenCalled()
})

test('account switch during initialization blocks old-user purchase', async () => {
  const service = await import('./purchases')
  mocks.configure.mockImplementation(async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'bob' } } } })
  })
  await expect(service.purchasePackage(pkg('credits_taster'), 'alice')).rejects.toThrow('account changed')
  expect(mocks.purchasePackage).not.toHaveBeenCalled()
  await service.purchasePackage(pkg('credits_taster'), 'bob')
  expect(mocks.logIn).toHaveBeenCalledWith({ appUserID: 'bob' })
})

test('logout waits for purchase to finish and next purchase logs in again', async () => {
  const service = await import('./purchases')
  let complete!: () => void
  mocks.purchasePackage.mockImplementation(() => new Promise<void>(resolve => { complete = resolve }))
  const purchase = service.purchasePackage(pkg('credits_taster'), 'alice')
  await vi.waitFor(() => expect(mocks.purchasePackage).toHaveBeenCalledTimes(1))
  const logout = service.logOutPurchases()
  expect(mocks.logOut).not.toHaveBeenCalled()
  complete(); await purchase; await logout
  await service.getOfferings('alice')
  expect(mocks.logIn).toHaveBeenCalledWith({ appUserID: 'alice' })
})

test('catalog ignores substring/type matches and rejects duplicate exact matches', () => {
  const exact = pkg('viastellis_premium:monthly')
  expect(findPurchasePackage([pkg('another_monthly'), exact], SUBSCRIPTIONS[0])).toBe(exact)
  expect(findPurchasePackage([pkg('another_monthly')], SUBSCRIPTIONS[0])).toBeUndefined()
  expect(findPurchasePackage([exact, exact], SUBSCRIPTIONS[0])).toBeUndefined()
})

test('profile polling tolerates delayed webhook and stops when balance arrives', async () => {
  vi.useFakeTimers()
  const read = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(0).mockResolvedValue(10)
  const result = waitForPurchaseProfile<number>(read, balance => balance >= 10, new AbortController().signal)
  await vi.runAllTimersAsync()
  expect(await result).toBe(true); expect(read).toHaveBeenCalledTimes(3)
})

test('polling times out without claiming fulfillment and cancels on unmount', async () => {
  vi.useFakeTimers()
  const read = vi.fn().mockResolvedValue(0)
  const result = waitForPurchaseProfile<number>(read, balance => balance >= 10, new AbortController().signal)
  await vi.runAllTimersAsync()
  expect(await result).toBe(false); expect(read).toHaveBeenCalledTimes(6)
  const controller = new AbortController(); controller.abort(); read.mockClear()
  expect(await waitForPurchaseProfile(read, () => true, controller.signal)).toBe(false)
  expect(read).not.toHaveBeenCalled()
})

test('a late webhook is still picked up by the slow background pass', async () => {
  // The fast pass gives up at ~19s. Fulfilment that lands after that used to be
  // invisible until the user forced a refresh, leaving "still syncing" on screen
  // indefinitely. The slow pass is what now catches it.
  vi.useFakeTimers()
  const read = vi.fn().mockResolvedValue(0)
  const signal = new AbortController().signal

  const fast = waitForPurchaseProfile<number>(read, b => b >= 10, signal)
  await vi.runAllTimersAsync()
  expect(await fast).toBe(false)

  read.mockResolvedValue(10) // webhook finally lands
  const slow = waitForPurchaseProfile<number>(read, b => b >= 10, signal, SLOW_POLL_MS)
  await vi.runAllTimersAsync()
  expect(await slow).toBe(true)
})

test('the background pass stops immediately when the page unmounts', async () => {
  vi.useFakeTimers()
  const read = vi.fn().mockResolvedValue(0)
  const controller = new AbortController()
  controller.abort()
  expect(await waitForPurchaseProfile(read, () => true, controller.signal, SLOW_POLL_MS)).toBe(false)
  expect(read).not.toHaveBeenCalled()
})
