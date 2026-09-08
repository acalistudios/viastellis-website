/**
 * Purchases service — RevenueCat SDK integration for Capacitor (Android/iOS).
 *
 * Links Google Play In-App Billing and Subscriptions to Supabase user IDs.
 * Purchases are verified server-side by the `revenuecat-webhook` Edge Function,
 * which grants credits and updates the profile's tier idempotently.
 */

import { Capacitor } from '@capacitor/core'
import {
  Purchases,
  type PurchasesOfferings,
  type PurchasesPackage,
  type CustomerInfo,
} from '@revenuecat/purchases-capacitor'

const API_KEY = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY || ''

let configured = false

/**
 * Initializes the RevenueCat SDK on native platforms with the current user ID.
 * Safe to call repeatedly; reconfigures or logs in when the user ID changes.
 */
export async function initPurchases(appUserId?: string | null): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false
  }

  if (!API_KEY) {
    console.warn('RevenueCat public key (VITE_REVENUECAT_PUBLIC_KEY) is not set.')
    return false
  }

  try {
    if (!configured) {
      await Purchases.configure({
        apiKey: API_KEY,
        appUserID: appUserId || undefined,
      })
      configured = true
    } else if (appUserId) {
      await Purchases.logIn({ appUserID: appUserId })
    }
    return true
  } catch (err) {
    console.error('Failed to initialize RevenueCat:', err)
    return false
  }
}

/**
 * Link purchases to the newly authenticated Supabase user ID.
 */
export async function logInPurchases(appUserId: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || !configured) return
  try {
    await Purchases.logIn({ appUserID: appUserId })
  } catch (err) {
    console.error('RevenueCat logIn error:', err)
  }
}

/**
 * Reset purchase identity when the user signs out.
 */
export async function logOutPurchases(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !configured) return
  try {
    await Purchases.logOut()
  } catch (err) {
    console.error('RevenueCat logOut error:', err)
  }
}

/**
 * Fetch available offerings (subscriptions & consumable packs) configured in RevenueCat.
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!Capacitor.isNativePlatform()) return null
  try {
    return await Purchases.getOfferings()
  } catch (err) {
    console.error('RevenueCat getOfferings error:', err)
    return null
  }
}

/**
 * Trigger native Google Play purchase flow for a specific RevenueCat package.
 */
export async function purchasePackage(aPackage: PurchasesPackage) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('In-app purchases are only available on mobile devices.')
  }
  return await Purchases.purchasePackage({ aPackage })
}

/**
 * Restore previously purchased subscriptions and transactions.
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Restore is only available on mobile devices.')
  }
  const result = await Purchases.restorePurchases()
  return result.customerInfo
}
