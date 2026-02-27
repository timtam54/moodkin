'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { CreditCardPay } from './credit-card-pay'
import { subscriptionConfig } from '@/lib/config/subscription'

interface PaymentDialogProps {
  open: boolean
  onClose: () => void
  username: string
  email: string
  amount?: number
  onSuccess: (customerId: string) => void
}

export function PaymentDialog({ open, onClose, username, email, amount = subscriptionConfig.price, onSuccess }: PaymentDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const handlePaymentResult = async (success: boolean, customerId?: string) => {
    if (success && customerId) {
      setPaymentSuccess(true)

      try {
        await fetch('/api/user/subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId }),
        })
      } catch (err) {
        console.error('Failed to update subscription status:', err)
      }

      setTimeout(() => {
        onSuccess(customerId)
        onClose()
        window.location.reload()
      }, 1500)
    }
    setIsProcessing(false)
  }

  const handleClose = () => {
    if (!isProcessing) {
      setPaymentSuccess(false)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-moodkin-gold/20 rounded-full flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-moodkin-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-moodkin-dark">Subscribe to Moodkin</h2>
            <p className="text-sm text-moodkin-gray">Unlock all premium features</p>
          </div>
        </div>

        {/* Payment Form */}
        <div className="mt-2">
          {paymentSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-700 font-semibold mb-2">Subscription Created!</p>
              <p className="text-moodkin-gray text-sm">Welcome to Moodkin Premium</p>
            </div>
          ) : isProcessing ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8 text-moodkin-gold" />
              <span className="ml-2 text-moodkin-gray">Processing payment...</span>
            </div>
          ) : (
            <CreditCardPay
              amount={amount}
              username={username}
              email={email}
              onResult={handlePaymentResult}
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-moodkin-gray">
          <p>Your payment is secured by Stripe</p>
        </div>
      </div>
    </Dialog>
  )
}
