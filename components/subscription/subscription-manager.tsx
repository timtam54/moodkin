'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Mail,
  Crown,
  CreditCard,
  Loader2,
  HelpCircle,
  Sparkles,
} from 'lucide-react'
import { logout } from '@/lib/auth/client'
import { PaymentDialog } from '@/components/payment/payment-dialog'
import { subscriptionConfig, formatPrice, getSubscriptionState } from '@/lib/config/subscription'
import { useOnboarding } from '@/hooks/use-onboarding'
import { useSession } from '@/hooks/use-session'

interface SubscriptionManagerProps {
  onClose?: () => void
  showProfileActions?: boolean
}

export function SubscriptionManager({ onClose, showProfileActions = true }: SubscriptionManagerProps) {
  const router = useRouter()
  const { session } = useSession()
  const { restartOnboarding } = useOnboarding()
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  const [aiImageCount, setAiImageCount] = useState<{ count: number; limit: number; month: string } | null>(null)

  const user = session?.user

  const subscriptionState = user
    ? getSubscriptionState(user.stripeid, user.subscriptionEndsAt, user.subscriptionStatus)
    : { status: 'none' as const, endsAt: new Date() }

  // Fetch AI image count for active or cancelled subscriptions
  useEffect(() => {
    const hasAccess = subscriptionState.status === 'active' || subscriptionState.status === 'cancelled'
    if (hasAccess) {
      fetch('/api/user/ai-image-count')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setAiImageCount(data)
        })
        .catch(err => console.error('Failed to fetch AI image count:', err))
    }
  }, [subscriptionState.status])

  const handleTakeTour = () => {
    onClose?.()
    restartOnboarding()
  }

  const handlePaymentSuccess = async (customerId: string) => {
    try {
      const response = await fetch('/api/user/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeid: customerId }),
      })
      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to update subscription:', error)
    }
  }

  const handleManageSubscription = async () => {
    if (!user?.stripeid) return
    setIsLoadingPortal(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to open subscription portal. Please try again or contact support.')
      }
    } catch (error) {
      console.error('Failed to open subscription portal:', error)
      alert('Failed to open subscription portal. Please try again.')
    } finally {
      setIsLoadingPortal(false)
    }
  }

  const handleSubscribe = () => {
    setPaymentDialogOpen(true)
  }

  if (!user) return null

  return (
    <>
      <div className="flex flex-col items-center text-center">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name || 'Profile photo'}
            width={120}
            height={120}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-[120px] h-[120px] rounded-full bg-moodkin-gold flex items-center justify-center">
            <span className="text-4xl font-bold text-moodkin-dark">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <h2 className="text-xl font-bold text-moodkin-dark mt-4">
          {user.name || 'User'}
        </h2>
        <div className="flex items-center gap-2 text-moodkin-gray mt-1">
          <Mail className="w-4 h-4" />
          <span className="text-sm">{user.email}</span>
        </div>

        {/* Subscription Status */}
        <div className="mt-4 flex flex-col items-center gap-2 w-full">
          {subscriptionState.status === 'active' && (
            <>
              <div className="flex items-center gap-2 px-4 py-2 bg-moodkin-gold/20 text-moodkin-dark rounded-xl">
                <Crown className="w-4 h-4 text-moodkin-gold" />
                <span className="text-sm font-medium">Subscribed</span>
              </div>

              {/* AI Image Usage */}
              {aiImageCount && (
                <div className="w-full mt-2 p-3 bg-moodkin-cream/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-moodkin-gold" />
                      <span className="text-sm font-medium text-moodkin-dark">AI Images</span>
                    </div>
                    <span className="text-sm text-moodkin-gray">
                      {aiImageCount.count} / {aiImageCount.limit}
                    </span>
                  </div>
                  <div className="h-2 bg-moodkin-light-gray rounded-full overflow-hidden">
                    <div
                      className="h-full bg-moodkin-gold rounded-full transition-all"
                      style={{ width: `${Math.min((aiImageCount.count / aiImageCount.limit) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-moodkin-gray mt-1 text-center">
                    {aiImageCount.month}
                  </p>
                </div>
              )}

              <button
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
                className="flex items-center gap-2 px-4 py-2 border border-moodkin-light-gray hover:bg-moodkin-cream text-moodkin-dark font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {isLoadingPortal ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                {isLoadingPortal ? 'Loading...' : 'Manage Subscription'}
              </button>
            </>
          )}

          {subscriptionState.status === 'cancelled' && (
            <>
              <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-2 text-amber-700 mb-1">
                  <Crown className="w-4 h-4" />
                  <span className="text-sm font-medium">Subscription Cancelled</span>
                </div>
                <p className="text-xs text-amber-600">
                  You still have access until {subscriptionState.endsAt.toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>

              {/* AI Image Usage - still show while they have access */}
              {aiImageCount && (
                <div className="w-full mt-2 p-3 bg-moodkin-cream/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-moodkin-gold" />
                      <span className="text-sm font-medium text-moodkin-dark">AI Images</span>
                    </div>
                    <span className="text-sm text-moodkin-gray">
                      {aiImageCount.count} / {aiImageCount.limit}
                    </span>
                  </div>
                  <div className="h-2 bg-moodkin-light-gray rounded-full overflow-hidden">
                    <div
                      className="h-full bg-moodkin-gold rounded-full transition-all"
                      style={{ width: `${Math.min((aiImageCount.count / aiImageCount.limit) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-moodkin-gray mt-1 text-center">
                    {aiImageCount.month}
                  </p>
                </div>
              )}

              <button
                onClick={handleSubscribe}
                className="flex items-center gap-2 px-4 py-2 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-medium rounded-xl transition-colors"
              >
                <Crown className="w-4 h-4" />
                Resubscribe - {formatPrice()}/month
              </button>
            </>
          )}

          {subscriptionState.status === 'expired' && (
            <>
              <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 text-red-700 mb-1">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm font-medium">Subscription Ended</span>
                </div>
                <p className="text-xs text-red-600">
                  Your subscription has ended. You have not been billed.
                </p>
              </div>
              <button
                onClick={handleSubscribe}
                className="flex items-center gap-2 px-4 py-2 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-medium rounded-xl transition-colors"
              >
                <Crown className="w-4 h-4" />
                Subscribe now - {formatPrice()}/month
              </button>
            </>
          )}

          {subscriptionState.status === 'none' && (
            <>
              <div className="flex items-center gap-2 px-4 py-2 bg-moodkin-light-gray/30 text-moodkin-gray rounded-xl">
                <span className="text-sm font-medium">Not Subscribed</span>
              </div>
              <button
                onClick={handleSubscribe}
                className="flex items-center gap-2 px-4 py-2 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-medium rounded-xl transition-colors"
              >
                <Crown className="w-4 h-4" />
                Subscribe now - {formatPrice()}/month
              </button>
            </>
          )}
        </div>

        {showProfileActions && (
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex gap-3">
              <Link
                href="/dashboard/settings"
                onClick={() => onClose?.()}
                className="px-4 py-2 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-medium rounded-xl transition-colors"
              >
                Edit Profile
              </Link>
              <button
                onClick={() => logout()}
                className="px-4 py-2 border border-moodkin-light-gray hover:bg-moodkin-cream text-moodkin-dark font-medium rounded-xl transition-colors"
              >
                Sign Out
              </button>
            </div>
            <button
              onClick={handleTakeTour}
              className="flex items-center justify-center gap-2 px-4 py-2 text-moodkin-gray hover:text-moodkin-dark text-sm transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              Take a tour.
            </button>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        username={user.name || user.email}
        email={user.email}
        amount={subscriptionConfig.price}
        onSuccess={handlePaymentSuccess}
      />
    </>
  )
}
