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
  email: string
  onResult: (success: boolean, customerId?: string) => void
}

// EXACT COPY FROM INCIDENTACCIDENT (adapted for moodkin)
export function CreditCardPay({ amount, username, email, onResult }: CreditCardPayProps) {
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [showPromoInput, setShowPromoInput] = useState(false)
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
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

    // Check for promo code bypass
    if (promoApplied) {
      setProcessing(true)
      setError(null)

      // Bypass Stripe - use "Free Tester" as the customer ID
      setSucceeded(true)
      onResult(true, 'Free Tester')
      setProcessing(false)
      return
    }

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Create new subscription - EXACT PATTERN FROM INCIDENTACCIDENT
      const { error: backendError, clientSecret, customerId } = await fetch('/api/stripe/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          customerId: null,
          email: email,
          name: username,
        }),
      }).then(res => res.json())

      if (backendError) {
        setError(backendError)
        setProcessing(false)
        onResult(false)
        return
      }

      if (!clientSecret) {
        setError('Failed to initialize payment - no client secret received')
        setProcessing(false)
        onResult(false)
        return
      }

      // Confirm payment - EXACT PATTERN FROM INCIDENTACCIDENT
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
      {/* Hide price and card when promo applied */}
      {!promoApplied && (
        <>
          <div>
            <label className="block text-sm font-medium text-moodkin-dark mb-2">
              Monthly Subscription
            </label>
            <div className="border border-moodkin-light-gray rounded-xl p-3 bg-moodkin-cream/50">
              <span className="text-xl font-bold text-moodkin-dark">${amount.toFixed(2)}</span>
              <span className="text-moodkin-gray ml-1">AUD / month</span>
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
        </>
      )}

      {/* Promotion Code */}
      <div>
        {!showPromoInput ? (
          <button
            type="button"
            onClick={() => setShowPromoInput(true)}
            className="text-sm text-moodkin-gold hover:text-moodkin-gold-hover underline"
          >
            Have a promotion code?
          </button>
        ) : promoApplied ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-700 font-medium">Free Tester code applied!</span>
          </div>
        ) : (
          <div>
            <label htmlFor="promo-code" className="block text-sm font-medium text-moodkin-dark mb-2">
              Promotion Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="promo-code"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value)
                  setPromoError(null)
                }}
                placeholder="Enter promotion code"
                className="flex-1 border border-moodkin-light-gray rounded-xl p-3 bg-white text-moodkin-dark placeholder:text-moodkin-gray focus:outline-none focus:ring-2 focus:ring-moodkin-gold/50"
              />
              <button
                type="button"
                onClick={() => {
                  if (promoCode.trim().toLowerCase() === 'free tester') {
                    setPromoApplied(true)
                    setPromoError(null)
                  } else {
                    setPromoError('Invalid promotion code')
                  }
                }}
                className="px-4 py-3 bg-moodkin-dark text-white font-medium rounded-xl hover:bg-moodkin-dark/90 transition-colors"
              >
                Apply
              </button>
            </div>
            {promoError && <p className="text-red-500 text-sm mt-1">{promoError}</p>}
          </div>
        )}
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}
      {succeeded && <div className="text-green-600 text-sm font-medium">Subscription created!</div>}

      <button
        type="submit"
        disabled={(!stripe && !promoApplied) || processing || succeeded}
        className="w-full bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? 'Processing...' : succeeded ? 'Subscribed!' : promoApplied ? 'Activate Free Access' : 'Subscribe'}
      </button>
    </form>
  )
}
