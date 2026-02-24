'use client'

import { useState, FormEvent } from 'react'

interface CreditCardPayProps {
  amount: number
  username: string
  onResult: (success: boolean, customerId?: string) => void
}

export function CreditCardPay({ amount, username, onResult }: CreditCardPayProps) {
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    setProcessing(true)
    setError(null)

    try {
      // Create Stripe Checkout Session on backend
      const response = await fetch('/api/stripe/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
        }),
      })

      const data = await response.json()

      if (data.error) {
        if (data.alreadySubscribed) {
          setError('You already have an active subscription')
        } else {
          setError(data.error)
        }
        setProcessing(false)
        onResult(false)
        return
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setError('Failed to create checkout session')
        setProcessing(false)
        onResult(false)
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setProcessing(false)
      onResult(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-moodkin-dark mb-2">
          Amount
        </label>
        <div className="border border-moodkin-light-gray rounded-xl p-3 bg-moodkin-cream/50">
          <span className="text-xl font-bold text-moodkin-dark">${amount.toFixed(2)}</span>
          <span className="text-moodkin-gray ml-1">AUD / month</span>
        </div>
      </div>

      <div className="text-sm text-moodkin-gray">
        You will be redirected to Stripe&apos;s secure checkout to complete your subscription.
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={processing}
        className="w-full bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? 'Redirecting to checkout...' : 'Subscribe Now'}
      </button>
    </form>
  )
}
