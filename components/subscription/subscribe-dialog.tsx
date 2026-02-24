'use client'

import { useState } from 'react'
import { Check, X, Sparkles, FolderOpen, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { subscriptionConfig, formatPriceWithPeriod } from '@/lib/config/subscription'

interface SubscribeDialogProps {
  open: boolean
  onClose: () => void
  onSubscribe: () => Promise<void>
}

export function SubscribeDialog({ open, onClose, onSubscribe }: SubscribeDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubscribe = async () => {
    setIsLoading(true)
    try {
      await onSubscribe()
      onClose()
    } catch (error) {
      console.error('Failed to subscribe:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-lg">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-moodkin-gold to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-moodkin-dark">Upgrade to Premium</h2>
        <p className="text-moodkin-gray mt-2">Unlock the full potential of Moodkin</p>
      </div>

      {/* Pricing comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Free Plan */}
        <div className="border border-moodkin-light-gray rounded-xl p-4">
          <h3 className="font-semibold text-moodkin-dark mb-1">Free</h3>
          <p className="text-2xl font-bold text-moodkin-dark mb-4">$0<span className="text-sm font-normal text-moodkin-gray">/month</span></p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <FolderOpen className="w-4 h-4 text-moodkin-gold mt-0.5 flex-shrink-0" />
              <span className="text-moodkin-gray">3 projects</span>
            </li>
            <li className="flex items-start gap-2">
              <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <span className="text-moodkin-gray">AI Image Generator not available</span>
            </li>
          </ul>
        </div>

        {/* Premium Plan */}
        <div className="border-2 border-moodkin-gold rounded-xl p-4 relative bg-gradient-to-br from-moodkin-gold/5 to-amber-50">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-moodkin-gold text-moodkin-dark text-xs font-bold px-3 py-1 rounded-full">
            RECOMMENDED
          </div>
          <h3 className="font-semibold text-moodkin-dark mb-1">Premium</h3>
          <p className="text-2xl font-bold text-moodkin-dark mb-4">${subscriptionConfig.price}<span className="text-sm font-normal text-moodkin-gray">/{subscriptionConfig.period}</span></p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <FolderOpen className="w-4 h-4 text-moodkin-gold mt-0.5 flex-shrink-0" />
              <span className="text-moodkin-dark font-medium">Unlimited projects</span>
            </li>
            <li className="flex items-start gap-2">
              <ImageIcon className="w-4 h-4 text-moodkin-gold mt-0.5 flex-shrink-0" />
              <span className="text-moodkin-dark font-medium">100 AI images/month</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-moodkin-gold mt-0.5 flex-shrink-0" />
              <span className="text-moodkin-gray">1024x1024 resolution</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Subscribe button */}
      <Button
        onClick={handleSubscribe}
        disabled={isLoading}
        className="w-full py-3 bg-gradient-to-r from-moodkin-gold to-amber-600 hover:from-amber-500 hover:to-amber-700 text-moodkin-dark font-semibold rounded-xl"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Subscribe Now - ${formatPriceWithPeriod()}`
        )}
      </Button>

      <p className="text-xs text-moodkin-gray text-center mt-4">
        Secure payment via Stripe. Cancel anytime.
      </p>
    </Dialog>
  )
}
