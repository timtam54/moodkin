'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Loader2, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SubscriptionInfo {
  hasCustomer: boolean
  customerId?: string
  subscribed: boolean
  subscriptions?: Array<{
    id: string
    status: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
  }>
  activeSubscription?: {
    id: string
    status: string
    currentPeriodEnd: string
  } | null
  message?: string
  error?: string
}

export default function SubscriptionManagementPage() {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const fetchSubscriptionStatus = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/stripe/manage-subscription')
      const data = await response.json()
      setSubscriptionInfo(data)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch subscription status' })
    }
    setLoading(false)
  }

  const syncSubscription = async () => {
    setSyncing(true)
    setMessage(null)
    try {
      const response = await fetch('/api/stripe/manage-subscription', { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Subscription synced to database successfully!' })
        await fetchSubscriptionStatus()
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to sync subscription' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to sync subscription' })
    }
    setSyncing(false)
  }

  const cancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? This cannot be undone.')) {
      return
    }

    setCancelling(true)
    setMessage(null)
    try {
      const response = await fetch('/api/stripe/manage-subscription', { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Subscription cancelled successfully!' })
        await fetchSubscriptionStatus()
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to cancel subscription' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cancel subscription' })
    }
    setCancelling(false)
  }

  useEffect(() => {
    fetchSubscriptionStatus()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-moodkin-dark">Subscription Management</h1>
          <p className="text-moodkin-gray mt-1">View and manage your Moodkin subscription</p>
        </div>
        <Button variant="secondary" onClick={fetchSubscriptionStatus} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <p>{message.text}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin h-8 w-8 text-moodkin-gold" />
            <span className="ml-2 text-moodkin-gray">Loading subscription info...</span>
          </div>
        ) : subscriptionInfo?.error ? (
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600">{subscriptionInfo.error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Customer Status */}
            <div className="flex items-center gap-4 p-4 bg-moodkin-cream/50 rounded-xl">
              <div className="w-12 h-12 bg-moodkin-gold/20 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-moodkin-gold" />
              </div>
              <div>
                <p className="font-semibold text-moodkin-dark">
                  {subscriptionInfo?.hasCustomer ? 'Stripe Customer Found' : 'No Stripe Customer'}
                </p>
                {subscriptionInfo?.customerId && (
                  <p className="text-sm text-moodkin-gray">ID: {subscriptionInfo.customerId}</p>
                )}
              </div>
            </div>

            {/* Subscription Status */}
            {subscriptionInfo?.subscriptions && subscriptionInfo.subscriptions.length > 0 ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-moodkin-dark">Your Subscriptions</h3>
                {subscriptionInfo.subscriptions.map((sub) => (
                  <div key={sub.id} className="p-4 border border-moodkin-light-gray rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-moodkin-dark">Subscription</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        sub.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : sub.status === 'canceled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                    <p className="text-sm text-moodkin-gray">ID: {sub.id}</p>
                    <p className="text-sm text-moodkin-gray">
                      {sub.status === 'active' ? 'Renews' : 'Ends'}: {formatDate(sub.currentPeriodEnd)}
                    </p>
                    {sub.cancelAtPeriodEnd && (
                      <p className="text-sm text-orange-600 mt-1">
                        Will cancel at end of period
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-moodkin-gray">
                  {subscriptionInfo?.hasCustomer
                    ? 'No active subscriptions found'
                    : 'No subscription information available'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-moodkin-light-gray pt-6 space-y-3">
              {subscriptionInfo?.subscribed && (
                <>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={syncSubscription}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Subscription to Database
                      </>
                    )}
                  </Button>

                  <Button
                    variant="secondary"
                    className="w-full bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                    onClick={cancelSubscription}
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Subscription
                      </>
                    )}
                  </Button>
                </>
              )}

              {!subscriptionInfo?.subscribed && subscriptionInfo?.hasCustomer && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">No Active Subscription</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        You have a Stripe customer account but no active subscription.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
