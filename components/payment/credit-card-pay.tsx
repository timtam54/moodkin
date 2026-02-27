'use client'

import { useState } from 'react'

interface CreditCardPayProps {
  amount: number
  username: string
  email: string
  onResult: (success: boolean, customerId?: string) => void
}

export function CreditCardPay({ amount }: CreditCardPayProps) {
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const handleCheckout = async () => {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
        }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        setProcessing(false)
        return
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setError('Failed to create checkout session')
        setProcessing(false)
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-moodkin-dark mb-2">
          Monthly Subscription
        </label>
        <div className="border border-moodkin-light-gray rounded-xl p-3 bg-moodkin-cream/50">
          <span className="text-xl font-bold text-moodkin-dark">${amount.toFixed(2)}</span>
          <span className="text-moodkin-gray ml-1">AUD / month</span>
        </div>
      </div>

      <p className="text-sm text-moodkin-gray">
        You&apos;ll be redirected to Stripe&apos;s secure checkout to complete your subscription.
      </p>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <button
        onClick={handleCheckout}
        disabled={processing}
        className="w-full bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? 'Redirecting...' : 'Continue to Checkout'}
      </button>
    </div>
  )
}
