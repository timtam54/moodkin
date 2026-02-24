'use client'

import { useState, FormEvent } from 'react'
import {
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

interface CreditCardPayProps {
  amount: number
  username: string
  onResult: (success: boolean, customerId?: string) => void
}

export function CreditCardPay({ amount, username, onResult }: CreditCardPayProps) {
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  const stripe = useStripe()
  const elements = useElements()

  const cardElementOptions = {
    hidePostalCode: true,
    style: {
      base: {
        fontSize: '16px',
        color: '#1f2937',
        '::placeholder': {
          color: '#9ca3af',
        },
        iconColor: '#6b7280',
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Create payment intent on backend
      const response = await fetch('/api/stripe/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          username: username,
        }),
      })

      const { error: backendError, clientSecret, customerId } = await response.json()

      if (backendError) {
        setError(backendError)
        setProcessing(false)
        onResult(false)
        return
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      })

      if (stripeError) {
        setError(`Payment failed: ${stripeError.message}`)
        onResult(false)
      } else if (paymentIntent.status === 'succeeded') {
        setSucceeded(true)
        onResult(true, customerId)
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      onResult(false)
    }

    setProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-moodkin-dark mb-2">
          Amount
        </label>
        <div className="border border-moodkin-light-gray rounded-xl p-3 bg-moodkin-cream/50">
          <span className="text-xl font-bold text-moodkin-dark">${amount.toFixed(2)}</span>
          <span className="text-moodkin-gray ml-1">AUD</span>
        </div>
      </div>

      <div>
        <label htmlFor="card-element" className="block text-sm font-medium text-moodkin-dark mb-2">
          Credit or debit card
        </label>
        <div className="border border-moodkin-light-gray rounded-xl p-4 bg-white min-h-[44px]">
          <CardElement id="card-element" options={cardElementOptions} />
        </div>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}
      {succeeded && <div className="text-green-600 text-sm font-medium">Payment successful!</div>}

      <button
        type="submit"
        disabled={!stripe || processing || succeeded}
        className="w-full bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? 'Processing...' : succeeded ? 'Subscribed!' : 'Subscribe'}
      </button>
    </form>
  )
}
