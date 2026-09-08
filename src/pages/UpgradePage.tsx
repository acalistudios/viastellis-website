/**
 * UpgradePage — subscription plans + one-time credit packs.
 *
 * Cross-platform billing:
 * - On Web: powered by Stripe.
 * - On Native Android (Capacitor): powered by Google Play Billing via RevenueCat.
 *
 * Free features stay free; credits unlock Stella (AI) features.
 */

import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useUser } from '@/store/UserContext'
import { startCheckout, cancelSubscription } from '@/lib/billing'
import { getOfferings, purchasePackage, restorePurchases } from '@/lib/purchases'
import { SUBSCRIPTIONS, CREDIT_PACKS, type PlanOption } from '@/config/pricing'
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor'

export function UpgradePage() {
  const { profile, refreshProfile } = useUser()
  const [params] = useSearchParams()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelledAt, setCancelledAt] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState('')
  const [rcPackages, setRcPackages] = useState<PurchasesPackage[]>([])
  const [restoring, setRestoring] = useState(false)
  const [restoreSuccess, setRestoreSuccess] = useState('')

  const isNative = Capacitor.isNativePlatform()
  const cancelled = params.get('checkout') === 'cancelled'
  const isPremium = profile?.subscription_tier === 'premium'

  // Load native RevenueCat offerings when running in Android shell
  useEffect(() => {
    if (!isNative) return
    let mounted = true
    getOfferings().then(offerings => {
      if (!mounted || !offerings?.current?.availablePackages) return
      setRcPackages(offerings.current.availablePackages)
    })
    return () => {
      mounted = false
    }
  }, [isNative])

  // Only trust the stored price if it matches a plan we actually display; a
  // stale/unknown price falls back to null so we don't leave a premium user
  // with no "Active Plan" shown.
  const activePriceId =
    profile?.subscription_price_id &&
    SUBSCRIPTIONS.some(
      p =>
        (p.priceId && p.priceId === profile.subscription_price_id) ||
        (p.playProductId && p.playProductId === profile.subscription_price_id),
    )
      ? profile.subscription_price_id
      : null

  function findPackage(plan: PlanOption): PurchasesPackage | undefined {
    if (!rcPackages.length) return undefined
    return rcPackages.find(pkg => {
      const prodId = pkg.product.identifier
      if (plan.playProductId && (prodId === plan.playProductId || prodId.includes(plan.id))) {
        return true
      }
      if (plan.id === 'monthly' && pkg.packageType === 'MONTHLY') return true
      if (plan.id === 'annual' && pkg.packageType === 'ANNUAL') return true
      return false
    })
  }

  async function choose(plan: PlanOption) {
    setError('')
    setRestoreSuccess('')
    setBusyId(plan.id)

    if (isNative) {
      const pkg = findPackage(plan)
      if (!pkg) {
        setError('This product is being initialized in Google Play. Please try again in a moment.')
        setBusyId(null)
        return
      }
      try {
        await purchasePackage(pkg)
        // Give webhook ~2.5 seconds to process before re-fetching profile
        setTimeout(() => {
          refreshProfile()
        }, 2500)
      } catch (err: unknown) {
        const anyErr = err as { userCancelled?: boolean; message?: string }
        if (!anyErr?.userCancelled) {
          setError(anyErr?.message || 'Google Play purchase failed.')
        }
      } finally {
        setBusyId(null)
      }
    } else {
      // Web Stripe checkout
      try {
        await startCheckout(plan.priceId, plan.mode)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
        setBusyId(null)
      }
    }
  }

  async function handleRestore() {
    setRestoring(true)
    setError('')
    setRestoreSuccess('')
    try {
      await restorePurchases()
      await refreshProfile()
      setRestoreSuccess('Purchases restored successfully.')
    } catch (err: unknown) {
      const anyErr = err as { message?: string }
      setError(anyErr?.message || 'Could not restore purchases.')
    } finally {
      setRestoring(false)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    setCancelError('')
    try {
      const result = await cancelSubscription()
      setCancelledAt(result.cancel_at)
      setShowCancelConfirm(false)
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Could not cancel. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="min-h-screen bg-cosmos-950 text-slate-200">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/home" className="text-stardust-400 hover:text-stardust-300 text-sm">
          ← Back
        </Link>

        <h1 className="font-display text-4xl text-stardust-300 mt-6 mb-1">Unlock Stella</h1>
        <p className="text-slate-400 text-sm mb-2">
          Your chart, calendar, compatibility score, and journal are always free. Credits power
          Stella's personalized AI readings.
        </p>
        {profile && (
          <p className="text-xs text-slate-500 mb-6">
            Current balance: <span className="text-stellar-300 font-medium">{profile.credits_remaining} credits</span>
            {isPremium && <span className="text-stellar-400 font-medium"> · Premium</span>}
          </p>
        )}

        {cancelled && (
          <p className="text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-2 text-sm mb-4">
            Checkout cancelled — no charge was made.
          </p>
        )}
        {cancelledAt && (
          <p className="text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-4 py-2 text-sm mb-4">
            Subscription cancelled. You keep Premium access until{' '}
            <strong>
              {new Date(cancelledAt).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </strong>.
          </p>
        )}
        {restoreSuccess && (
          <p className="text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-4 py-2 text-sm mb-4">
            {restoreSuccess}
          </p>
        )}
        {error && (
          <p className="text-rose-300 bg-rose-400/10 border border-rose-400/20 rounded-lg px-4 py-2 text-sm mb-4">
            {error}
          </p>
        )}

        {/* Subscriptions */}
        <h2 className="text-slate-300 text-sm uppercase tracking-widest mt-4 mb-3">Subscribe & save</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {SUBSCRIPTIONS.map(plan => {
            const pkg = isNative ? findPackage(plan) : undefined
            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                pkg={pkg}
                busy={busyId === plan.id}
                onChoose={choose}
                isPremium={isPremium}
                currentPriceId={activePriceId}
                isNative={isNative}
              />
            )
          })}
        </div>

        {/* One-time packs */}
        <h2 className="text-slate-300 text-sm uppercase tracking-widest mb-3">Or buy a credit pack</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CREDIT_PACKS.map(plan => {
            const pkg = isNative ? findPackage(plan) : undefined
            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                pkg={pkg}
                busy={busyId === plan.id}
                onChoose={choose}
                compact
                isNative={isNative}
              />
            )
          })}
        </div>

        {/* Restore Purchases (Required for native mobile stores) */}
        {isNative && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="text-xs text-slate-400 hover:text-slate-200 underline transition-colors disabled:opacity-60"
            >
              {restoring ? 'Restoring purchases…' : 'Restore Purchases'}
            </button>
          </div>
        )}

        {/* Subscription Management */}
        {isPremium && !cancelledAt && (
          <div className="mt-10 pt-6 border-t border-cosmos-700">
            {profile?.subscription_source === 'play' ? (
              <div className="bg-cosmos-900 border border-cosmos-700 rounded-xl px-5 py-4 max-w-md">
                <p className="text-slate-200 text-sm font-medium mb-1">Manage Google Play Subscription</p>
                <p className="text-slate-400 text-xs mb-3">
                  Your subscription is billed through Google Play. You can review, switch, or cancel your renewal anytime in your Google Play account settings.
                </p>
                <a
                  href="https://play.google.com/store/account/subscriptions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-stardust-400 hover:text-stardust-300 text-xs underline"
                >
                  Open Google Play Subscriptions ↗
                </a>
              </div>
            ) : isNative && profile?.subscription_source === 'stripe' ? (
              <div className="bg-cosmos-900 border border-cosmos-700 rounded-xl px-5 py-4 max-w-md">
                <p className="text-slate-200 text-sm font-medium mb-1">Web Subscription Active</p>
                <p className="text-slate-400 text-xs">
                  Your subscription was created on the ViaStellis website. To manage or cancel your plan, please sign in at viastellis.com.
                </p>
              </div>
            ) : (
              /* Standard Web Stripe Cancellation */
              <div>
                {!showCancelConfirm ? (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="text-slate-500 hover:text-rose-400 text-sm underline transition-colors"
                  >
                    Cancel subscription
                  </button>
                ) : (
                  <div className="bg-cosmos-900 border border-rose-400/30 rounded-xl px-5 py-4 max-w-md">
                    <p className="text-slate-200 text-sm font-medium mb-1">Cancel your subscription?</p>
                    <p className="text-slate-400 text-xs mb-4">
                      You'll keep Premium access until the end of your current billing period. You won't be charged again unless you resubscribe.
                    </p>
                    {cancelError && (
                      <p className="text-rose-300 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2 text-xs mb-4">
                        {cancelError}
                      </p>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="rounded-full px-4 py-1.5 bg-rose-500 hover:bg-rose-400 text-white text-sm font-medium disabled:opacity-60 transition-colors"
                      >
                        {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="rounded-full px-4 py-1.5 border border-cosmos-600 text-slate-400 hover:text-slate-200 text-sm transition-colors"
                      >
                        Keep Premium
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-[11px] text-slate-600 mt-8">
          Premium includes all of Stella's AI readings, subject to fair-use limits.{' '}
          {isNative
            ? 'Payments are securely processed by Google Play. Subscriptions renew automatically; manage or cancel anytime in Google Play.'
            : 'Payments are securely processed by Stripe. Subscriptions renew automatically; cancel anytime.'}{' '}
          See our{' '}
          <Link to="/refund" className="underline">
            Refund Policy
          </Link>.
        </p>
      </div>
    </div>
  )
}

function PlanCard({
  plan,
  pkg,
  busy,
  onChoose,
  compact,
  isPremium = false,
  currentPriceId = null,
  isNative = false,
}: {
  plan: PlanOption
  pkg?: PurchasesPackage
  busy: boolean
  onChoose: (p: PlanOption) => void
  compact?: boolean
  isPremium?: boolean
  currentPriceId?: string | null
  isNative?: boolean
}) {
  const isSub = plan.mode === 'subscription'
  const isCurrent =
    isPremium &&
    isSub &&
    !!currentPriceId &&
    (plan.priceId === currentPriceId || (plan.playProductId && plan.playProductId === currentPriceId))

  const premiumUnknownPlan = isPremium && isSub && !currentPriceId
  const otherPlanWhilePremium = isPremium && isSub && !!currentPriceId && !isCurrent
  const disabled = busy || isCurrent || premiumUnknownPlan || otherPlanWhilePremium

  // Use localized price from Google Play if package is loaded on native
  const displayPrice = isNative && pkg?.product?.priceString ? pkg.product.priceString : plan.priceLabel

  const label = busy
    ? 'Starting…'
    : isCurrent
    ? 'Active Plan'
    : premiumUnknownPlan
    ? 'Premium active'
    : otherPlanWhilePremium
    ? 'Cancel to switch'
    : isSub
    ? 'Subscribe'
    : 'Buy'

  return (
    <div
      className={[
        'rounded-2xl border p-4 flex flex-col',
        plan.highlight
          ? 'border-stardust-400/50 bg-gradient-to-br from-cosmos-800/80 to-cosmos-900/80'
          : 'border-cosmos-700 bg-cosmos-900',
      ].join(' ')}
    >
      {plan.badge && (
        <span className="self-start text-[10px] uppercase tracking-wider text-stellar-300 border border-stellar-300/40 rounded-full px-2 py-0.5 mb-2">
          {plan.badge}
        </span>
      )}
      <p className="text-slate-100 font-display text-lg">{plan.label}</p>
      <p className="text-stardust-300 text-sm">{displayPrice}</p>
      <p className={`text-slate-500 ${compact ? 'text-[11px]' : 'text-xs'} mt-1 mb-3 flex-1`}>{plan.detail}</p>
      <button
        onClick={() => !disabled && onChoose(plan)}
        disabled={disabled}
        className="w-full rounded-full bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-medium py-2 disabled:opacity-60 transition-opacity"
      >
        {label}
      </button>
    </div>
  )
}
