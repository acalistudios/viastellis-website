import { Capacitor } from '@capacitor/core'
import { Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor'
import { supabase } from './supabase'

let configured = false
let identity: string | null = null
let queue: Promise<unknown> = Promise.resolve()

// Serialize SDK identity changes with store operations, including purchases.
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation)
  queue = result.catch(() => {})
  return result
}

async function requireIdentity(expectedUserId: string) {
  if (!Capacitor.isNativePlatform()) throw new Error('Purchases are available in the mobile app.')
  const key = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY
  if (!key) throw new Error('Purchases are not available in this build. Please try again after an app update.')
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user.id
  if (!userId || expectedUserId !== userId) throw new Error('Your account changed. Please reopen the purchase page.')
  if (!configured) {
    await Purchases.configure({ apiKey: key, appUserID: userId })
    configured = true
    identity = userId
  } else if (identity !== userId) {
    identity = null
    await Purchases.logIn({ appUserID: userId })
    identity = userId
  }
  const current = await supabase.auth.getSession()
  if (current.data.session?.user.id !== userId) throw new Error('Your account changed. Please reopen the purchase page.')
}

export async function initPurchases(appUserId?: string | null): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !appUserId) return false
  try {
    await serialize(() => requireIdentity(appUserId))
    return true
  } catch {
    // The purchase page surfaces configuration/identity errors with a retry.
    return false
  }
}

export async function logOutPurchases(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await serialize(async () => {
    if (!configured || !identity) return
    identity = null
    try { await Purchases.logOut() } catch { /* next operation requires logIn */ }
  })
}

export function getOfferings(userId: string) {
  return serialize(async () => {
    await requireIdentity(userId)
    return Purchases.getOfferings()
  })
}

export function purchasePackage(aPackage: PurchasesPackage, userId: string) {
  return serialize(async () => {
    await requireIdentity(userId)
    return Purchases.purchasePackage({ aPackage })
  })
}

export function restorePurchases(userId: string) {
  return serialize(async () => {
    await requireIdentity(userId)
    return (await Purchases.restorePurchases()).customerInfo
  })
}
