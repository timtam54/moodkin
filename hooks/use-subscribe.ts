'use client'

import { useCallback, useState } from 'react'
import { useIsAndroidApp } from '@/components/providers/platform-provider'
import { purchaseSubscription, PlayBillingUnavailableError } from '@/lib/play-billing/client'

interface UseSubscribeOptions {
  onStripeRequested: () => void
  onSuccess?: () => void | Promise<void>
}

/**
 * Unified entry point for "user tapped Subscribe / Upgrade".
 *
 * On the TWA (android-app platform): runs the Play Billing purchase flow,
 * calls /api/play-billing/verify, then onSuccess.
 * On the web (any browser or PWA): calls onStripeRequested so the caller
 * can open its own Stripe payment dialog.
 *
 * Callers should NOT open the Stripe dialog directly — always route through
 * this hook so Android users get Play Billing.
 */
export function useSubscribe({ onStripeRequested, onSuccess }: UseSubscribeOptions) {
  const isAndroid = useIsAndroidApp()
  const [isLaunchingPlayBilling, setIsLaunchingPlayBilling] = useState(false)

  const subscribe = useCallback(async () => {
    if (!isAndroid) {
      onStripeRequested()
      return
    }

    const productId = process.env.NEXT_PUBLIC_GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_ID
    if (!productId) {
      alert('Google Play subscription is not configured. Please contact support.')
      return
    }

    setIsLaunchingPlayBilling(true)
    try {
      const { purchaseToken } = await purchaseSubscription(productId)
      const res = await fetch('/api/play-billing/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseToken, productId }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Verification failed' }))
        throw new Error(error || 'Verification failed')
      }
      await onSuccess?.()
    } catch (err) {
      if (err instanceof PlayBillingUnavailableError) {
        alert(err.message)
      } else {
        console.error('Play Billing flow failed', err)
        alert('Subscription failed. Please try again or contact support.')
      }
    } finally {
      setIsLaunchingPlayBilling(false)
    }
  }, [isAndroid, onStripeRequested, onSuccess])

  return { subscribe, isLaunchingPlayBilling, isAndroid }
}
